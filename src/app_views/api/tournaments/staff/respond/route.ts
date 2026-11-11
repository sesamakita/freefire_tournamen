import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { staffId, action } = body;

    if (!staffId || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Parameter tidak valid (staffId & action wajib diisi)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Ambil data staff dan pastikan user_id sesuai dengan yang sedang login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffRow, error: fetchError } = await (admin as any)
      .from("tournament_staff")
      .select("*, tournaments(id, nama)")
      .eq("id", staffId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !staffRow) {
      return NextResponse.json(
        { error: "Undangan panitia tidak ditemukan atau bukan milik Anda" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      // 2. Set status menjadi 'accepted'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (admin as any)
        .from("tournament_staff")
        .update({ status: "accepted" })
        .eq("id", staffId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Gagal menerima undangan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "accept",
        message: `Selamat! Anda resmi menjadi staf turnamen ${staffRow.tournaments?.nama || ""}.`,
      });
    } else {
      // 3. Jika ditolak, hapus baris staf atau set 'declined'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (admin as any)
        .from("tournament_staff")
        .delete()
        .eq("id", staffId);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message || "Gagal menolak undangan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "decline",
        message: "Undangan panitia berhasil ditolak.",
      });
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
