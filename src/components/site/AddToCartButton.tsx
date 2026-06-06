import { useCart } from "@/lib/cart";
import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  sku: string;
  name: string;
  image: string | null;
  price: number | null;
  className?: string;
  variant?: "primary" | "compact";
};

export function AddToCartButton({ sku, name, image, price, className, variant = "primary" }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add({ sku, name, image, price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handle}
        className={
          "flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 " +
          (className ?? "")
        }
        aria-label="В корзину"
      >
        {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      className={
        "inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 " +
        (className ?? "")
      }
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {added ? "Добавлено" : "В корзину"}
    </button>
  );
}