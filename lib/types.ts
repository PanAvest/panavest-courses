// Minimal Database type for Supabase JS generics
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
        Update: {
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
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
