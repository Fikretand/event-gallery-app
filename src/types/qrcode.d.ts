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

  type QRCodeToStringOptions = QRCodeToDataURLOptions & {
    type?: "svg" | "utf8" | "terminal";
  };

  const QRCode: {
    toDataURL(input: string, options?: QRCodeToDataURLOptions): Promise<string>;
    /** With `type: "svg"`, the code as SVG markup. */
    toString(input: string, options?: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}
