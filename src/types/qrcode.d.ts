declare module "qrcode" {
  type QRCodeToDataURLOptions = {
    margin?: number;
    width?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  };

  const QRCode: {
    toDataURL(input: string, options?: QRCodeToDataURLOptions): Promise<string>;
  };

  export default QRCode;
}
