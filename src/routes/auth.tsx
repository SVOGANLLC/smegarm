import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { oauth } from "@/integrations/auth-oauth";
import { toast } from "sonner";
import { useI18n, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Smeg Armenia" }] }),
  component: AuthPage,
});

function LangSwitch() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ["hy", "ru", "en"];
  return (
    <div className="mt-8 flex justify-center gap-2">
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-sm px-3 py-1 text-xs uppercase tracking-wider ${lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = t("auth.metaTitle");
  }, [t]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admini", replace: true });
    });
  }, [navigate]);

  function validateEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;
  }

  function validatePassword(v: string) {
    return v.length >= 8 && v.length <= 72;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!validateEmail(em)) return toast.error(t("auth.emailInvalid"));
    if (!validatePassword(password)) {
      return toast.error(password.length > 72 ? t("auth.passwordMax") : t("auth.passwordMin"));
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: em,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) throw error;
        navigate({ to: "/admini", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setLoading(true);
    try {
      const result = await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admini",
      });
      if (result.error) {
        toast.error(t("auth.googleFailed"));
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/admini", replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
          {t("auth.home")}
        </Link>
        <div className="mt-8 rounded-sm border border-border bg-background p-8">
          <h1 className="font-serif text-3xl">{mode === "login" ? t("auth.login") : t("auth.signup")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

          <button
            type="button"
            onClick={signInGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-background px-4 py-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            {t("auth.google")}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("admin.or")} <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="eyebrow mb-1.5 block text-muted-foreground">{t("auth.name")}</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </div>
            )}
            <div>
              <label className="eyebrow mb-1.5 block text-muted-foreground">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block text-muted-foreground">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-sm bg-foreground px-4 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : mode === "login" ? t("auth.submitLogin") : t("auth.submitSignup")}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? t("auth.switchSignup") : t("auth.switchLogin")}
          </button>
        </div>
        <LangSwitch />
      </div>
    </div>
  );
}
