import QRCode from "qrcode";

/**
 * Validates standard UPI VPA (Virtual Payment Address) format
 * Examples: username@okhdfcbank, 9876543210@paytm, org@upi, builder@sbi
 */
export function isValidUpiId(upiId?: string | null): boolean {
  if (!upiId || typeof upiId !== "string") return false;
  const clean = upiId.trim();
  // Standard UPI VPA format: [alphanumeric/period/hyphen/underscore]@[bank/psp]
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(clean);
}

export interface UpiPaymentUriParams {
  upiId: string;
  payeeName: string;
  amount: number | string;
  currency?: string;
  transactionNote?: string;
}

/**
 * Constructs a standardized NPCI/RBI UPI deep-link intent URI.
 * Opens UPI applications (GPay, PhonePe, Paytm, BHIM, Cred) on mobile devices.
 */
export function buildUpiPaymentUri(params: UpiPaymentUriParams): string {
  const cleanUpi = params.upiId.trim();
  const cleanName = params.payeeName.trim().replace(/[^a-zA-Z0-9 ]/g, " ");
  const cleanAmount = Number(params.amount).toFixed(2);
  const currency = params.currency || "INR";
  const note = (params.transactionNote || "Hackathon Registration").trim().replace(/[^a-zA-Z0-9 -_]/g, "");

  const queryParams = new URLSearchParams({
    pa: cleanUpi,
    pn: cleanName,
    am: cleanAmount,
    cu: currency,
    tn: note,
  });

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Generates an offline, high-contrast QR Code as a Data URL (base64 image).
 */
export async function generateUpiQrCodeDataUrl(
  params: UpiPaymentUriParams,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const uri = buildUpiPaymentUri(params);
  return QRCode.toDataURL(uri, {
    width: options?.width || 320,
    margin: options?.margin ?? 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
