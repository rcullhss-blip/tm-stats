// Database type definitions for TM Stats
// These mirror the Supabase schema exactly

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          handicap: number | null
          created_at: string
          subscription_status: 'free' | 'pro' | 'team'
          feedback_level: 'simple' | 'intermediate' | 'advanced'
          coach_persona: string
          sg_baseline: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          handicap?: number | null
          created_at?: string
          subscription_status?: 'free' | 'pro' | 'team'
          feedback_level?: 'simple' | 'intermediate' | 'advanced'
          coach_persona?: string
          sg_baseline?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          name?: string | null
          handicap?: number | null
          subscription_status?: 'free' | 'pro' | 'team'
          feedback_level?: 'simple' | 'intermediate' | 'advanced'
          coach_persona?: string
          sg_baseline?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      rounds: {
        Row: {
          id: string
          user_id: string
          date: string
          course_name: string
          holes: 9 | 18
          round_type: 'practice' | 'tournament' | 'competition'
          input_mode: 'quick' | 'full'
          par_total: number | null
          score_total: number | null
          notes: string | null
          notes_updated_at: string | null
          mood: 'tough' | 'average' | 'good' | 'great' | null
          conditions: string | null
          energy_level: 'fresh' | 'normal' | 'tired' | 'niggly' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          course_name: string
          holes: 9 | 18
          round_type: 'practice' | 'tournament' | 'competition'
          input_mode?: 'quick' | 'full'
          par_total?: number | null
          score_total?: number | null
          notes?: string | null
          mood?: 'tough' | 'average' | 'good' | 'great' | null
          conditions?: string | null
          energy_level?: 'fresh' | 'normal' | 'tired' | 'niggly' | null
          created_at?: string
        }
        Update: {
          date?: string
          course_name?: string
          holes?: 9 | 18
          round_type?: 'practice' | 'tournament' | 'competition'
          par_total?: number | null
          score_total?: number | null
          notes?: string | null
          notes_updated_at?: string | null
          mood?: 'tough' | 'average' | 'good' | 'great' | null
          conditions?: string | null
          energy_level?: 'fresh' | 'normal' | 'tired' | 'niggly' | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      holes: {
        Row: {
          id: string
          round_id: string
          hole_number: number
          par: 3 | 4 | 5
          score: number
          fir: boolean | null
          gir: boolean | null
          putts: number | null
          up_and_down: boolean | null
          sand_save: boolean | null
          distance_to_pin_yards: number | null
          lie_type: string | null
          hole_note: string | null
          shots: Json | null
        }
        Insert: {
          id?: string
          round_id: string
          hole_number: number
          par: 3 | 4 | 5
          score: number
          fir?: boolean | null
          gir?: boolean | null
          putts?: number | null
          up_and_down?: boolean | null
          sand_save?: boolean | null
          distance_to_pin_yards?: number | null
          lie_type?: string | null
          hole_note?: string | null
          shots?: Json | null
        }
        Update: {
          par?: 3 | 4 | 5
          score?: number
          fir?: boolean | null
          gir?: boolean | null
          putts?: number | null
          up_and_down?: boolean | null
          sand_save?: boolean | null
          distance_to_pin_yards?: number | null
          lie_type?: string | null
          hole_note?: string | null
          shots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "holes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}

// Convenience types
export type UserRow = Database['public']['Tables']['users']['Row']
export type RoundRow = Database['public']['Tables']['rounds']['Row']
export type HoleRow = Database['public']['Tables']['holes']['Row']

export type RoundType = 'practice' | 'tournament' | 'competition'
export type InputMode = 'quick' | 'full'
export type SubscriptionStatus = 'free' | 'pro' | 'team'
export type MoodTag = 'tough' | 'average' | 'good' | 'great'
export type EnergyTag = 'fresh' | 'normal' | 'tired' | 'niggly'
export type ConditionTag = 'sunny' | 'windy' | 'rainy' | 'cold' | 'hot'

export type LieType = 'tee' | 'fairway' | 'rough' | 'bunker' | 'fringe' | 'green' | 'penalty'

export interface ShotEntry {
  shotNumber: number
  distanceToPin: number
  lieType: LieType
}

export interface RoundWithHoles extends RoundRow {
  holeData: HoleRow[]
}

// Stats derived from holes data
export interface RoundStats {
  fairwaysHit: number
  fairwaysTotal: number
  greensInRegulation: number
  totalPutts: number
  upAndDowns: number
  upAndDownAttempts: number
  sandSaves: number
  sandSaveAttempts: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  doubleBogeyPlus: number
}
