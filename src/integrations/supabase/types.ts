export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_products: {
        Row: {
          collection_id: string
          created_at: string
          product_sku: string
          sort_weight: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          product_sku: string
          sort_weight?: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          product_sku?: string
          sort_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          description_en: string | null
          description_hy: string | null
          id: string
          is_published: boolean
          name: string
          name_en: string | null
          name_hy: string | null
          slug: string
          sort_weight: number
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          id?: string
          is_published?: boolean
          name: string
          name_en?: string | null
          name_hy?: string | null
          slug: string
          sort_weight?: number
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          id?: string
          is_published?: boolean
          name?: string
          name_en?: string | null
          name_hy?: string | null
          slug?: string
          sort_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      color_swatches: {
        Row: {
          colour: string
          created_at: string
          hex: string
          name_en: string | null
          name_hy: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          colour: string
          created_at?: string
          hex: string
          name_en?: string | null
          name_hy?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          colour?: string
          created_at?: string
          hex?: string
          name_en?: string | null
          name_hy?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          internal_notes: string | null
          lang: string
          message: string | null
          name: string
          phone: string | null
          product_sku: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          lang?: string
          message?: string | null
          name: string
          phone?: string | null
          product_sku?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          lang?: string
          message?: string | null
          name?: string
          phone?: string | null
          product_sku?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          order_id: string
          product_sku: string | null
          qty: number
          subtotal_amd: number
          unit_price_amd: number
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name: string
          order_id: string
          product_sku?: string | null
          qty?: number
          subtotal_amd?: number
          unit_price_amd?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          order_id?: string
          product_sku?: string | null
          qty?: number
          subtotal_amd?: number
          unit_price_amd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          admin_notes: string | null
          city: string | null
          comment: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_method: string
          id: string
          internal_notes: string | null
          items_count: number
          lang: string
          order_no: number
          payment_method: string
          payment_status: string | null
          px_number: string | null
          status: string
          status_history: Json
          total_amd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          comment?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_method?: string
          id?: string
          internal_notes?: string | null
          items_count?: number
          lang?: string
          order_no?: number
          payment_method?: string
          payment_status?: string | null
          px_number?: string | null
          status?: string
          status_history?: Json
          total_amd?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          comment?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_method?: string
          id?: string
          internal_notes?: string | null
          items_count?: number
          lang?: string
          order_no?: number
          payment_method?: string
          payment_status?: string | null
          px_number?: string | null
          status?: string
          status_history?: Json
          total_amd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          aesthetic: string | null
          availability: string
          badge_text: string | null
          brand: string | null
          category: string | null
          category_en: string | null
          category_hy: string | null
          colour: string | null
          colour_en: string | null
          colour_hy: string | null
          created_at: string
          description: string | null
          description_en: string | null
          description_hy: string | null
          discount_percent: number
          ean: string | null
          energy_label: string | null
          family: string | null
          images: string[]
          is_bestseller: boolean
          is_featured: boolean
          is_new: boolean
          is_published: boolean
          is_special_offer: boolean
          lead_time_days: number | null
          main_image: string | null
          model_group: string | null
          name: string
          name_en: string | null
          name_hy: string | null
          og_image: string | null
          pdf: string | null
          price_amd: number | null
          price_old: number | null
          promo_ends_at: string | null
          promo_starts_at: string | null
          search_tsv: unknown
          seo_description: string | null
          seo_title: string | null
          sku: string
          slug: string | null
          sort_weight: number
          specs: Json
          specs_en: Json | null
          specs_hy: Json | null
          stock_qty: number
          stock_reserved: number
          theme_key: string | null
          translated_at: string | null
          updated_at: string
          url: string | null
          view_count: number
        }
        Insert: {
          aesthetic?: string | null
          availability?: string
          badge_text?: string | null
          brand?: string | null
          category?: string | null
          category_en?: string | null
          category_hy?: string | null
          colour?: string | null
          colour_en?: string | null
          colour_hy?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          discount_percent?: number
          ean?: string | null
          energy_label?: string | null
          family?: string | null
          images?: string[]
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          is_special_offer?: boolean
          lead_time_days?: number | null
          main_image?: string | null
          model_group?: string | null
          name: string
          name_en?: string | null
          name_hy?: string | null
          og_image?: string | null
          pdf?: string | null
          price_amd?: number | null
          price_old?: number | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          search_tsv?: unknown
          seo_description?: string | null
          seo_title?: string | null
          sku: string
          slug?: string | null
          sort_weight?: number
          specs?: Json
          specs_en?: Json | null
          specs_hy?: Json | null
          stock_qty?: number
          stock_reserved?: number
          theme_key?: string | null
          translated_at?: string | null
          updated_at?: string
          url?: string | null
          view_count?: number
        }
        Update: {
          aesthetic?: string | null
          availability?: string
          badge_text?: string | null
          brand?: string | null
          category?: string | null
          category_en?: string | null
          category_hy?: string | null
          colour?: string | null
          colour_en?: string | null
          colour_hy?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          discount_percent?: number
          ean?: string | null
          energy_label?: string | null
          family?: string | null
          images?: string[]
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          is_special_offer?: boolean
          lead_time_days?: number | null
          main_image?: string | null
          model_group?: string | null
          name?: string
          name_en?: string | null
          name_hy?: string | null
          og_image?: string | null
          pdf?: string | null
          price_amd?: number | null
          price_old?: number | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          search_tsv?: unknown
          seo_description?: string | null
          seo_title?: string | null
          sku?: string
          slug?: string | null
          sort_weight?: number
          specs?: Json
          specs_en?: Json | null
          specs_hy?: Json | null
          stock_qty?: number
          stock_reserved?: number
          theme_key?: string | null
          translated_at?: string | null
          updated_at?: string
          url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      themes: {
        Row: {
          accent_color: string | null
          background_color: string | null
          background_image: string | null
          card_bg: string | null
          created_at: string
          description: string | null
          description_en: string | null
          description_hy: string | null
          key: string
          name: string
          name_en: string | null
          name_hy: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          background_image?: string | null
          card_bg?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          key: string
          name: string
          name_en?: string | null
          name_hy?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          background_image?: string | null
          card_bg?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_hy?: string | null
          key?: string
          name?: string
          name_en?: string | null
          name_hy?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_orders: { Args: { _user_id: string }; Returns: boolean }
      compute_model_group: {
        Args: {
          p_colour: string
          p_family: string
          p_name: string
          p_sku: string
        }
        Returns: string
      }
      compute_theme_key: {
        Args: { p_aesthetic: string; p_name: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_products: {
        Args: { max_rows?: number; only_published?: boolean; q: string }
        Returns: {
          category: string
          colour: string
          is_published: boolean
          main_image: string
          name: string
          price_amd: number
          rank: number
          sku: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "manager"],
    },
  },
} as const
