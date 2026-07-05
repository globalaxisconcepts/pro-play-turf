import { ScrollFX } from "@/components/fx/ScrollFX";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader variant="marketing" />
      <main>{children}</main>
      <SiteFooter />
      <ScrollFX />
    </>
  );
}
