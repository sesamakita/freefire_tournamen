import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const { data: staffList, error } = await db
      .from("tournament_staff")
      .select(`
        id,
        role,
        status,
        created_at,
        invited_by,
        users:user_id (id, nama, email, no_wa)
      `)
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: staffList });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;

    // 1. Pastikan yang mengundang adalah owner atau admin turnamen ini
    const { data: myStaffRow } = await db
      .from("tournament_staff")
      .select("role, status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myStaffRow || !["owner", "admin"].includes(myStaffRow.role)) {
      return NextResponse.json(
        { error: "Hanya Pemilik (Owner) atau Admin turnamen yang dapat mengundang staf baru" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emailOrWa, role } = body;

    if (!emailOrWa || typeof emailOrWa !== "string") {
      return NextResponse.json(
        { error: "Email atau nomor WhatsApp pengguna wajib diisi" },
        { status: 400 }
      );
    }

    const selectedRole = role === "admin" ? "admin" : "panitia";
    const cleanSearch = emailOrWa.trim().toLowerCase();

    // 2. Cari target pengguna di public.users (bisa cari lewat email atau no_wa)
    const { data: targetUser } = await db
      .from("users")
      .select("id, nama, email, no_wa")
      .or(`email.ilike.${cleanSearch},no_wa.eq.${cleanSearch}`)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        {
          error: `Pengguna dengan identitas "${emailOrWa}" belum terdaftar di Arena Tempur. Pastikan pengguna sudah mendaftarkan akunnya terlebih dahulu.`,
        },
        { status: 404 }
      );
    }

    // 3. Cek apakah target pengguna sudah ada di tournament_staff
    const { data: existingStaff } = await db
      .from("tournament_staff")
      .select("id, role, status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingStaff) {
      if (existingStaff.status === "pending") {
        return NextResponse.json(
          {
            error: `${targetUser.nama} (${targetUser.email}) sudah memiliki undangan pending. Tunggu user menerima di dashboard miliknya.`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: `${targetUser.nama} (${targetUser.email}) sudah resmi menjadi ${existingStaff.role} di turnamen ini.`,
        },
        { status: 409 }
      );
    }

    // 4. Masukkan ke tournament_staff dengan status 'pending'
    const { data: newInvite, error: insertError } = await db
      .from("tournament_staff")
      .insert({
        tournament_id: tournamentId,
        user_id: targetUser.id,
        role: selectedRole,
        status: "pending",
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Gagal membuat undangan staf" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newInvite,
      message: `Undangan berhasil dikirim ke ${targetUser.nama}! Pengguna dapat menerima atau menolak undangan di dashboard akunnya.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;

    // Pastikan pemanggil adalah owner
    const { data: myStaff } = await db
      .from("tournament_staff")
      .select("role")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myStaff || myStaff.role !== "owner") {
      return NextResponse.json(
        { error: "Hanya Pemilik (Owner) turnamen yang berhak mencopot staf" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json({ error: "staffId wajib disertakan" }, { status: 400 });
    }

    // Tidak boleh mencopot diri sendiri (owner)
    const { data: targetStaff } = await db
      .from("tournament_staff")
      .select("role, user_id")
      .eq("id", staffId)
      .single();

    if (targetStaff?.role === "owner") {
      return NextResponse.json(
        { error: "Pemilik (Owner) utama turnamen tidak dapat dicopot" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await db
      .from("tournament_staff")
      .delete()
      .eq("id", staffId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Staf berhasil dihapus / undangan dibatalkan.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
