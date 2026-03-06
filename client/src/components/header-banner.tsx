import { useQuery } from "@tanstack/react-query";
import "./header-banner.css";

interface HomeContent {
  bannerActive?: boolean;
  bannerMessage?: string;
  bannerPriority?: string;
}

interface HeaderBannerProps {
  className?: string;
}

export function HeaderBanner({ className = "" }: HeaderBannerProps) {
  const { data } = useQuery<HomeContent>({
    queryKey: ["/api/home-content"],
  });

  if (!data?.bannerActive || !data?.bannerMessage) return null;

  const textColor = data.bannerPriority === "important" ? "#E6FF3F" : "#d4ff00";

  return (
    <div className={`ticker ${className}`} data-testid="header-banner">
      <div className="ticker-track" data-testid="header-banner-text">
        <span className="ticker-text" style={{ color: textColor }}>
          {data.bannerMessage} &#x2731;
        </span>
        <span className="ticker-text" style={{ color: textColor }}>
          {data.bannerMessage} &#x2731;
        </span>
      </div>
    </div>
  );
}
