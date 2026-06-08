import "./globals.css";

export const metadata = {
  title: "TradeLog - trading journal",
  description: "A clean, distraction-free trading journal with a coaching score that helps you sharpen your edge.",
  manifest: "/manifest.json",
  themeColor: "#0B0C0F",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TradeLog" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0C0F",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
