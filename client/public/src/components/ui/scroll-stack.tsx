import * as React from "react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ScrollStackCard {
  title: string;
  subtitle?: string;
  badge?: string;
  backgroundImage?: string;
  content?: ReactNode;
}

interface ScrollStackProps {
  cards: ScrollStackCard[];
  backgroundColor?: string;
  cardHeight?: string;
  animationDuration?: string;
  sectionHeightMultiplier?: number;
  intersectionThreshold?: number;
  className?: string;
}

const defaultBackgrounds = [
  "https://images.pexels.com/photos/6985136/pexels-photo-6985136.jpeg",
  "https://images.pexels.com/photos/6985128/pexels-photo-6985128.jpeg",
  "https://images.pexels.com/photos/2847648/pexels-photo-2847648.jpeg",
];

const ScrollStack: React.FC<ScrollStackProps> = ({
  cards,
  backgroundColor = "bg-background",
  cardHeight = "60vh",
  animationDuration = "0.5s",
  sectionHeightMultiplier = 3,
  intersectionThreshold = 0.1,
  className = "",
}) => {
  const sectionRef = React.useRef<HTMLDivElement | null>(null);
  const cardsContainerRef = React.useRef<HTMLDivElement | null>(null);

  const [activeCardIndex, setActiveCardIndex] = React.useState(0);
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);

  const ticking = React.useRef(false);

  const cardCount = Math.min(cards.length, 5);

  const cardStyle: React.CSSProperties = {
    height: cardHeight,
    maxHeight: "500px",
    borderRadius: "20px",
    transition: `transform ${animationDuration} cubic-bezier(0.19, 1, 0.22, 1), opacity ${animationDuration} cubic-bezier(0.19, 1, 0.22, 1)`,
    willChange: "transform, opacity",
  };

  React.useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: intersectionThreshold }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, [intersectionThreshold]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          if (!sectionRef.current) {
            ticking.current = false;
            return;
          }

          const rect = sectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight || 1;
          const sectionHeight = sectionRef.current.offsetHeight || viewportHeight;
          const totalScrollable = Math.max(sectionHeight - viewportHeight, 0);

          if (totalScrollable === 0) {
            setActiveCardIndex(0);
            setScrollProgress(0);
            ticking.current = false;
            return;
          }

          const scrolled = Math.min(Math.max(0, -rect.top), totalScrollable);
          const progress = scrolled / totalScrollable;

          setScrollProgress(progress);

          let newActiveIndex = 0;
          const progressPerCard = 1 / Math.max(cardCount, 1);
          for (let i = 0; i < cardCount; i++) {
            if (progress >= progressPerCard * (i + 1)) {
              newActiveIndex = i + 1;
            }
          }

          setActiveCardIndex(Math.min(newActiveIndex, cardCount - 1));
          ticking.current = false;
        });
      }
    };

    if (typeof window === "undefined") return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [cardCount]);

  const getCardTransform = (index: number) => {
    const isSectionVisible = isIntersecting;
    const baseScale = 0.9 + index * 0.05;

    if (!isSectionVisible) {
      return {
        transform: `translateY(100px) scale(${baseScale})`,
        opacity: 0,
        zIndex: 10 + index * 10,
        pointerEvents: "none" as CSSProperties["pointerEvents"],
      };
    }

    const progressPerCard = 1 / Math.max(cardCount, 1);
    const start = progressPerCard * index;
    const end = progressPerCard * (index + 1);
    const range = Math.max(end - start, 0.0001);
    const rawLocal = (scrollProgress - start) / range;
    const clampedLocal = Math.min(1, Math.max(0, rawLocal));
    const eased = clampedLocal * clampedLocal * (3 - 2 * clampedLocal);

    const fromY = 100;
    const toY = 90 - index * 30;
    const translateY = fromY + (toY - fromY) * eased;

    const isActive = activeCardIndex >= index;
    const opacity = clampedLocal > 0 || isActive ? (index === 0 ? 0.9 : 1) : 0;

    return {
      transform: `translateY(${translateY}px) scale(${baseScale})`,
      opacity,
      zIndex: 10 + index * 10,
      pointerEvents: (opacity > 0 ? "auto" : "none") as CSSProperties["pointerEvents"],
    };
  };

  return (
    <section
      ref={sectionRef}
      className={cn("relative", className)}
      style={{ height: `${sectionHeightMultiplier * 100}vh` }}
    >
      <div
        className={cn(
          "sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden",
          backgroundColor
        )}
      >
        <div className="container mx-auto flex h-full flex-col justify-center px-6 lg:px-8">
          <div
            ref={cardsContainerRef}
            className="relative mx-auto w-full max-w-5xl flex-shrink-0"
            style={{ height: cardHeight }}
          >
            {cards.slice(0, 5).map((card, index) => {
              const cardTransform = getCardTransform(index);
              const backgroundImage =
                card.backgroundImage ||
                defaultBackgrounds[index % defaultBackgrounds.length];

              return (
                <div
                  key={index}
                  className="absolute z-50 overflow-hidden shadow-xl transition-all duration-300"
                  style={{
                    ...cardStyle,
                    top: 0,
                    left: "50%",
                    transform: `translateX(-50%) ${cardTransform.transform}`,
                    width: "100%",
                    maxWidth: "100%",
                    opacity: cardTransform.opacity,
                    zIndex: cardTransform.zIndex,
                    pointerEvents: cardTransform.pointerEvents,
                  }}
                >
                  <div
                    className="absolute inset-0 z-0 bg-gradient-to-b from-black/40 to-black/80"
                    style={{
                      backgroundImage: `url('${backgroundImage}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundBlendMode: "overlay",
                    }}
                  />
                  {card.badge && (
                    <div className="absolute right-4 top-4 z-20">
                      <div className="inline-flex items-center justify-center rounded-full bg-white/20 px-4 py-2 text-white backdrop-blur-sm">
                        <span className="text-sm font-medium">{card.badge}</span>
                      </div>
                    </div>
                  )}
                  <div className="relative z-10 flex h-full items-center p-5 sm:p-6 md:p-8">
                    {card.content ? (
                      card.content
                    ) : (
                      <div className="max-w-lg">
                        <h3 className="mb-4 text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-lg text-white/80">{card.subtitle}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScrollStack;
