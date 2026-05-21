declare module "qrcode" {
  type QRCodeToDataURLOptions = {
    margin?: number;
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
