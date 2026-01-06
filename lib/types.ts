/* eslint @typescript-eslint/no-empty-object-type: off */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          slug: string | null;
          title: string | null;
          description: string | null;
          level: string | null;
          price: number | null;
          cpd_points: number | null;
          img: string | null;
          accredited: string[] | null;
          published: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          slug?: string | null;
          title?: string | null;
          description?: string | null;
          level?: string | null;
          price?: number | null;
          cpd_points?: number | null;
          img?: string | null;
          accredited?: string[] | null;
          published?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          slug: string | null;
          title: string | null;
          description: string | null;
          level: string | null;
          price: number | null;
          cpd_points: number | null;
          img: string | null;
          accredited: string[] | null;
          published: boolean | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      ebooks: {
        Row: {
          id: string;
          slug: string | null;
          title: string | null;
          description: string | null;
          cover_url: string | null;
          price_cents: number | null;
          published: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          slug?: string | null;
          title?: string | null;
          description?: string | null;
          cover_url?: string | null;
          price_cents?: number | null;
          published?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          slug: string | null;
          title: string | null;
          description: string | null;
          cover_url: string | null;
          price_cents: number | null;
          published: boolean | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      ebook_purchases: {
        Row: {
          user_id: string;
          ebook_id: string;
          status: string | null;
          paid_at: string | null;
          updated_at: string | null;
          paystack_reference: string | null;
        };
        Insert: {
          user_id: string;
          ebook_id: string;
          status?: string | null;
          paid_at?: string | null;
          updated_at?: string | null;
          paystack_reference?: string | null;
        };
        Update: Partial<{
          user_id: string;
          ebook_id: string;
          status: string | null;
          paid_at: string | null;
          updated_at: string | null;
          paystack_reference: string | null;
        }>;
        Relationships: [];
      };
      program_ebook_links: {
        Row: {
          id: string;
          course_id: string;
          ebook_id: string;
          active: boolean | null;
          created_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          ebook_id: string;
          active?: boolean | null;
          created_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<{
          id: string;
          course_id: string;
          ebook_id: string;
          active: boolean | null;
          created_at: string | null;
          created_by: string | null;
        }>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          hero_title: string | null;
          hero_subtitle: string | null;
          primary_color: string | null;
          accent_color: string | null;
          bg_color: string | null;
          text_color: string | null;
          social: Json | null;
          footer_copy: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          hero_title?: string | null;
          hero_subtitle?: string | null;
          primary_color?: string | null;
          accent_color?: string | null;
          bg_color?: string | null;
          text_color?: string | null;
          social?: Json | null;
          footer_copy?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          hero_title: string | null;
          hero_subtitle: string | null;
          primary_color: string | null;
          accent_color: string | null;
          bg_color: string | null;
          text_color: string | null;
          social: Json | null;
          footer_copy: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
