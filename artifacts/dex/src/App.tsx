import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { DesktopTradePage } from "@/desktop/DesktopTradePage";
import { MobileTradePage } from "@/mobile/MobileTradePage";
import { LandingPage } from "@/pages/LandingPage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileThemeProvider } from "@/contexts/ThemeContext";
import { WalletProvider } from "@/contexts/WalletProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TranslationProvider } from "@/i18n/i18n";

const queryClient = new QueryClient();

function TradePage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <MobileTradePage /> : <DesktopTradePage />;
}

function Router() {
  return (
    <Switch>
      {/* Landing page */}
      <Route path="/" component={LandingPage} />

      {/* App pages — all share MobileTradePage/DesktopTradePage which manages its own tabs */}
      <Route path="/trade" component={TradePage} />
      <Route path="/trade/:pairId" component={TradePage} />
      <Route path="/markets" component={TradePage} />
      <Route path="/portfolio" component={TradePage} />

      {/* Legacy ?app=1 links — redirect to /trade so old bookmarks still work */}
      <Route path="/" component={({ location }: any) => {
        const params = new URLSearchParams(location.search);
        if (params.get("app") === "1") return <Redirect to="/trade" />;
        return <LandingPage />;
      }} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TranslationProvider>
    <MobileThemeProvider>
      <SettingsProvider>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <Sonner position="top-right" richColors />
          </TooltipProvider>
        </QueryClientProvider>
      </WalletProvider>
      </SettingsProvider>
    </MobileThemeProvider>
    </TranslationProvider>
  );
}

export default App;
