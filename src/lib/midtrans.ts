import crypto from "crypto";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const BASE_URL = IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

export type QrisChargeResponse = {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  orderId: string;
  grossAmount: number;
  qrCodeUrl: string;
  qrString: string;
  expiryTime: string;
};

/**
 * Menghasilkan Dynamic QRIS via Midtrans Core API
 */
export async function createMidtransQris({
  orderId,
  grossAmount,
  teamName,
  captainName,
  email,
  phone,
}: {
  orderId: string;
  grossAmount: number;
  teamName: string;
  captainName: string;
  email: string;
  phone?: string;
}): Promise<QrisChargeResponse> {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY belum diatur di environment.");
  }

  const authHeader = `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

  const payload = {
    payment_type: "qris",
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: "REG_FEE",
        price: grossAmount,
        quantity: 1,
        name: `Biaya Turnamen - ${teamName}`.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: (captainName || "Kapten").slice(0, 30),
      email: email || "kapten@arenatempur.id",
      phone: phone || "081234567890",
    },
    qris: {
      acquirer: "gopay",
    },
  };

  const response = await fetch(`${BASE_URL}/v2/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || (data.status_code !== "201" && data.status_code !== "200")) {
    console.error("Midtrans QRIS Charge Error:", data);
    throw new Error(data.status_message || "Gagal membuat transaksi QRIS.");
  }

  // Cari URL gambar QR Code dari actions
  const qrAction = (data.actions || []).find(
    (a: { name: string; url: string }) => a.name === "generate-qr-code"
  );

  return {
    statusCode: data.status_code,
    statusMessage: data.status_message,
    transactionId: data.transaction_id,
    orderId: data.order_id,
    grossAmount: Number(data.gross_amount),
    qrCodeUrl: qrAction ? qrAction.url : "",
    qrString: data.qr_string || "",
    expiryTime: data.expiry_time || "",
  };
}

/**
 * Verifikasi keamanan webhook Midtrans menggunakan SHA512 Signature Key
 */
export function verifyMidtransSignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
}: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  if (!MIDTRANS_SERVER_KEY) return false;

  const rawString = `${orderId}${statusCode}${grossAmount}${MIDTRANS_SERVER_KEY}`;
  const computedHash = crypto.createHash("sha512").update(rawString).digest("hex");

  return computedHash.toLowerCase() === signatureKey.toLowerCase();
}
