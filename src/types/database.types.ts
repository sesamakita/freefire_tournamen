export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TournamentStatus = 'draft' | 'open' | 'closed' | 'running' | 'done'
export type StaffRole = 'owner' | 'admin' | 'panitia'
export type PaymentStatus = 'unpaid' | 'submitted' | 'verified' | 'rejected'
export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type RoleTim = 'rusher' | 'sniper' | 'support' | 'igl' | 'cadangan'
export type MatchStatus = 'scheduled' | 'ongoing' | 'selesai' | 'dibatalkan'
export type ResultStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'disputed'
export type DisputeStatus = 'open' | 'upheld' | 'rejected'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          nama: string
          no_wa: string
          email_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nama: string
          no_wa: string
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nama?: string
          no_wa?: string
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          organizer_id: string
          nama: string
          slug: string
          deskripsi: string | null
          logo_url: string | null
          banner_url: string | null
          entry_fee: number
          qris_image_url: string | null
          point_config: Json
          point_config_locked: boolean
          max_teams: number
          tgl_mulai: string
          tgl_selesai: string
          status: TournamentStatus
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          nama: string
          slug: string
          deskripsi?: string | null
          logo_url?: string | null
          banner_url?: string | null
          entry_fee?: number
          qris_image_url?: string | null
          point_config?: Json
          point_config_locked?: boolean
          max_teams?: number
          tgl_mulai: string
          tgl_selesai: string
          status?: TournamentStatus
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          nama?: string
          slug?: string
          deskripsi?: string | null
          logo_url?: string | null
          banner_url?: string | null
          entry_fee?: number
          qris_image_url?: string | null
          point_config?: Json
          point_config_locked?: boolean
          max_teams?: number
          tgl_mulai?: string
          tgl_selesai?: string
          status?: TournamentStatus
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_staff: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          role: StaffRole
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          role: StaffRole
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          role?: StaffRole
          invited_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          kapten_user_id: string
          nama: string
          logo_url: string | null
          payment_status: PaymentStatus
          payment_proof_url: string | null
          verification_status: VerificationStatus
          rejection_reason: string | null
          verified_by: string | null
          verified_at: string | null
          is_manual: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          kapten_user_id: string
          nama: string
          logo_url?: string | null
          payment_status?: PaymentStatus
          payment_proof_url?: string | null
          verification_status?: VerificationStatus
          rejection_reason?: string | null
          verified_by?: string | null
          verified_at?: string | null
          is_manual?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          kapten_user_id?: string
          nama?: string
          logo_url?: string | null
          payment_status?: PaymentStatus
          payment_proof_url?: string | null
          verification_status?: VerificationStatus
          rejection_reason?: string | null
          verified_by?: string | null
          verified_at?: string | null
          is_manual?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          token: string
          ign: string
          uid_game: string
          role_tim: RoleTim
          is_substitute: boolean
          status: InviteStatus
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          token?: string
          ign: string
          uid_game: string
          role_tim?: RoleTim
          is_substitute?: boolean
          status?: InviteStatus
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          token?: string
          ign?: string
          uid_game?: string
          role_tim?: RoleTim
          is_substitute?: boolean
          status?: InviteStatus
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          ign: string
          uid_game: string
          role_tim: RoleTim
          is_substitute: boolean
          invitation_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          ign: string
          uid_game: string
          role_tim?: RoleTim
          is_substitute?: boolean
          invitation_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          ign?: string
          uid_game?: string
          role_tim?: RoleTim
          is_substitute?: boolean
          invitation_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          nama: string
          round: number
          grup: string | null
          jadwal: string
          room_id: string | null
          room_pass: string | null
          status: MatchStatus
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          nama: string
          round?: number
          grup?: string | null
          jadwal: string
          room_id?: string | null
          room_pass?: string | null
          status?: MatchStatus
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          nama?: string
          round?: number
          grup?: string | null
          jadwal?: string
          room_id?: string | null
          room_pass?: string | null
          status?: MatchStatus
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_teams: {
        Row: {
          id: string
          match_id: string
          team_id: string
          slot: number
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          team_id: string
          slot: number
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          team_id?: string
          slot?: number
          created_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          id: string
          match_id: string
          team_id: string
          placement: number
          kills: number
          points: number
          screenshot_url: string
          submitted_by: string
          submitted_at: string
          verified_by: string | null
          verified_at: string | null
          status: ResultStatus
          rejection_reason: string | null
          is_recalculated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          team_id: string
          placement: number
          kills: number
          points?: number
          screenshot_url: string
          submitted_by: string
          submitted_at?: string
          verified_by?: string | null
          verified_at?: string | null
          status?: ResultStatus
          rejection_reason?: string | null
          is_recalculated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          team_id?: string
          placement?: number
          kills?: number
          points?: number
          screenshot_url?: string
          submitted_by?: string
          submitted_at?: string
          verified_by?: string | null
          verified_at?: string | null
          status?: ResultStatus
          rejection_reason?: string | null
          is_recalculated?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          id: string
          result_id: string
          team_id: string
          submitted_by: string
          alasan: string
          bukti_urls: string[]
          status: DisputeStatus
          decided_by: string | null
          decision_reason: string | null
          decided_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          result_id: string
          team_id: string
          submitted_by: string
          alasan: string
          bukti_urls?: string[]
          status?: DisputeStatus
          decided_by?: string | null
          decision_reason?: string | null
          decided_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          result_id?: string
          team_id?: string
          submitted_by?: string
          alasan?: string
          bukti_urls?: string[]
          status?: DisputeStatus
          decided_by?: string | null
          decision_reason?: string | null
          decided_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          tournament_id: string | null
          actor_id: string | null
          action: string
          entity: string
          entity_id: string
          before_data: Json | null
          after_data: Json | null
          reason: string | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          actor_id?: string | null
          action: string
          entity: string
          entity_id: string
          before_data?: Json | null
          after_data?: Json | null
          reason?: string | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string | null
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string
          before_data?: Json | null
          after_data?: Json | null
          reason?: string | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      standings: {
        Row: {
          team_id: string
          tournament_id: string
          team_nama: string
          logo_url: string | null
          matches_played: number
          total_kills: number
          total_points: number
          best_placement: number | null
          earliest_submit: string | null
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_tournament_staff: {
        Args: {
          tid: string
          roles: StaffRole[]
        }
        Returns: boolean
      }
    }
    Enums: {
      tournament_status: TournamentStatus
      staff_role: StaffRole
      payment_status: PaymentStatus
      verification_status: VerificationStatus
      invite_status: InviteStatus
      role_tim: RoleTim
      match_status: MatchStatus
      result_status: ResultStatus
      dispute_status: DisputeStatus
    }
  }
}

