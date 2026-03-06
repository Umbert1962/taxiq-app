import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Film } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  description: string;
  filename: string;
  category: string;
}

const mediaItems: MediaItem[] = [
  {
    id: "driver-location-demo",
    title: "GPS kierowcy — śledzenie w tle",
    description: "Demonstracja działania usługi lokalizacji w tle w aplikacji kierowcy TaxiQ.",
    filename: "driver-location-demo.mp4",
    category: "Kierowca",
  },
];

export default function MediaLibrary() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const categories = [...new Set(mediaItems.map(item => item.category))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-media-title">
              <Film className="w-6 h-6 text-primary" />
              Materiały wideo TaxiQ
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Filmy instruktażowe i demonstracyjne</p>
          </div>
        </div>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-primary mb-4" data-testid={`text-category-${category}`}>
              {category}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mediaItems
                .filter(item => item.category === category)
                .map(item => (
                  <Card key={item.id} className="glow-border overflow-hidden" data-testid={`card-media-${item.id}`}>
                    <CardContent className="p-0">
                      {playingId === item.id ? (
                        <video
                          src={`/media/files/${item.filename}`}
                          controls
                          autoPlay
                          className="w-full aspect-video bg-black"
                          data-testid={`video-${item.id}`}
                        />
                      ) : (
                        <button
                          onClick={() => setPlayingId(item.id)}
                          className="w-full aspect-video bg-black/50 flex items-center justify-center group cursor-pointer relative"
                          data-testid={`button-play-${item.id}`}
                        >
                          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 transition-colors">
                            <Play className="w-8 h-8 text-primary fill-primary" />
                          </div>
                        </button>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm" data-testid={`text-media-name-${item.id}`}>{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}

        {mediaItems.length === 0 && (
          <div className="text-center py-16">
            <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak materiałów wideo</p>
          </div>
        )}
      </div>
    </div>
  );
}
