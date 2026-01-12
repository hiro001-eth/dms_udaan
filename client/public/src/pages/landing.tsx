import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Lenis from "@studio-freight/lenis";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScrollStack, { type ScrollStackCard } from "@/components/ui/scroll-stack";
import { Shield, Search, Users, BarChart3, ArrowRight, CheckCircle2, Lock, FolderOpen, Sparkles } from "lucide-react";
import logoUrl from "@assets/udaan-logo.svg";

const sectionVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.98, rotateX: -3 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 55, damping: 22 },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const scrollStackCards: ScrollStackCard[] = [
  {
    title: "Security that doesn't blink",
    subtitle:
      "Lock down documents with roles, per‑organization isolation, and every critical action logged.",
    badge: "Security",
  },
  {
    title: "Search that actually finds",
    subtitle:
      "Search across names and metadata so the right document is always a few keystrokes away.",
    badge: "Search",
  },
  {
    title: "See everything, not just files",
    subtitle:
      "Dashboards show document volume, activity, and who's using the system in real time.",
    badge: "Analytics",
  },
  {
    title: "Built for teams, not individuals",
    subtitle:
      "Onboard teammates with the right permissions on day one and keep everyone in the same workspace.",
    badge: "Collaboration",
  },
];

export default function LandingPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const prefersReducedMotionRef = useRef(false);

  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -30]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.97]);
  const orbOffset = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const [activeSection, setActiveSection] = useState<
    "hero" | "features" | "how" | "why" | "cta"
  >("hero");

  const featuresRef = useRef<HTMLElement | null>(null);
  const howItWorksRef = useRef<HTMLElement | null>(null);
  const whyRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotionRef.current = mediaQuery.matches;
    }

    if (prefersReducedMotionRef.current) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      lerp: 0.08,
    });

    lenisRef.current = lenis;

    let frameId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === featuresRef.current) {
            setActiveSection("features");
          } else if (entry.target === howItWorksRef.current) {
            setActiveSection("how");
          } else if (entry.target === whyRef.current) {
            setActiveSection("why");
          } else if (entry.target === ctaRef.current) {
            setActiveSection("cta");
          }
        });
      },
      { threshold: 0.4 }
    );

    const sections = [featuresRef, howItWorksRef, whyRef, ctaRef];
    sections.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      if (value < 0.15) {
        setActiveSection("hero");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [scrollYProgress]);

  const handleScroll = (
    event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    sectionId: string
  ) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target);
    } else {
      target.scrollIntoView({
        behavior: prefersReducedMotionRef.current ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <motion.div
        className="fixed inset-x-0 top-0 z-40 h-[2px] origin-left bg-gradient-to-r from-[#00E0FF] via-slate-300 to-[#ff6b35]"
        style={shouldReduceMotion ? undefined : { scaleX: scrollYProgress }}
      />
      <div className="relative overflow-hidden">
        {/* background orbs */}
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10"
          style={shouldReduceMotion ? undefined : { y: orbOffset }}
        >
          <div className="absolute -top-40 -right-32 h-72 w-72 rounded-full bg-[#00E0FF]/5 blur-3xl" />
          <div className="absolute top-40 -left-32 h-72 w-72 rounded-full bg-[#ff6b35]/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-40 w-[40rem] -translate-x-1/2 bg-gradient-to-t from-white to-transparent" />
          <div className="absolute bottom-0 left-1/2 h-40 w-[40rem] -translate-x-1/2 bg-gradient-to-t from-white to-transparent" />
        </motion.div>

        {/* navbar */}
        <header
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 bg-white"
          aria-label="Primary navigation"
        >
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="UDAAN DMS" className="h-9 w-9 rounded-xl bg-white p-1.5 shadow-sm" />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-900">UDAAN DMS</p>
              <p className="text-xs text-slate-500">Secure document flight for modern teams</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/login">
              <Button
                variant="outline"
                className="border-slate-200 bg-white text-xs font-medium text-slate-900 hover:bg-slate-50 hover:text-slate-950"
              >
                Get started
              </Button>
            </Link>
          </div>
        </header>

        {/* hero */}
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 md:pb-28 md:pt-10" role="main">
          <div className="mb-6 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            <span>
              {activeSection === "hero" && "01 — Overview"}
              {activeSection === "features" && "02 — Features"}
              {activeSection === "how" && "03 — How it works"}
              {activeSection === "why" && "04 — Why UDAAN"}
              {activeSection === "cta" && "05 — Get started"}
            </span>
            <span className="ml-4 h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
          </div>
          <motion.section
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center [perspective:1200px]"
            style={shouldReduceMotion ? undefined : { y: heroY, scale: heroScale }}
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Shield className="h-3 w-3" />
                </span>
                Built for teams who refuse to lose control of their documents
              </div>

              <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your documents, <span className="text-[#00E0FF]">secured</span>, organized, <span className="text-[#ffb347]">always in reach</span>.
              </h1>

              <p className="mt-4 max-w-xl text-sm text-slate-600 sm:text-base">
                Built for teams who refuse to lose control of their documents, UDAAN DMS keeps your documents secure,
                organized, and always in reach in one simple workspace. With no contracts, role‑based access, full audit
                trails, and a live control panel, you get every document and every action in one view—secure by design and
                compliance‑friendly. Instant structure with folders, tags, and versions makes everything active and
                organized from day one, while powerful search finds the right file in under 500 ms. Audit every action to
                see who touched what and when, and confidently scale from 3 teammates to 3000 without changing tools. Get
                started or see how teams use UDAAN in practice.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href="/login">
                  <Button className="rounded-full bg-[#00E0FF] px-6 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:bg-[#0ff0ff]">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="#features"
                  onClick={(event) => handleScroll(event, "features")}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  or see how teams use UDAAN in practice
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Role‑based access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Full audit trail</span>
                </div>
              </div>
            </div>

            {/* hero visual */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="relative flex justify-center md:justify-end"
            >
              <motion.div
                className="relative h-[320px] w-full max-w-md rounded-3xl bg-gradient-to-br from-white/90 via-white to-white/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.04)]"
                whileHover={shouldReduceMotion ? undefined : { rotateX: -3, rotateY: 5, translateY: -4 }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="pointer-events-none absolute inset-px rounded-[1.4rem] border border-slate-200/80" />

                {/* mini logo row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Sparkles className="h-4 w-4 text-[#00E0FF]" />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-slate-900">Live control panel</p>
                      <p className="text-[10px] text-slate-500">Every document, every action, one view</p>
                    </div>
                  </div>
                  <Badge className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300">
                    Secure by design
                  </Badge>
                </div>

                {/* stacked cards */}
                <div className="mt-4 grid gap-3 text-xs text-slate-600">
                  <Card className="border-slate-200 bg-white/5 backdrop-blur">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E0FF]/15">
                          <FolderOpen className="h-4 w-4 text-[#00E0FF]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Instant structure</p>
                          <p className="text-[11px] text-slate-500">Folders, tags, versions—all in one place.</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">Active</span>
                    </CardContent>
                  </Card>

                  <Card className="border-white/5 bg-white/5 backdrop-blur">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff6b35]/20">
                          <Search className="h-4 w-4 text-[#ffb347]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Search everything</p>
                          <p className="text-[11px] text-slate-500">Find the right file in seconds, not hours.</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">&lt; 500ms avg</span>
                    </CardContent>
                  </Card>

                  <Card className="border-white/5 bg-white/5 backdrop-blur">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                          <Lock className="h-4 w-4 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Audit every action</p>
                          <p className="text-[11px] text-slate-500">Who touched what, when—no more guessing.</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-600">Compliance‑friendly</span>
                    </CardContent>
                  </Card>
                </div>

                {/* floating stat chip */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="absolute -bottom-6 left-8 flex items-center gap-3 rounded-2xl bg-slate-100/90 px-4 py-3 text-xs text-slate-600 shadow-lg backdrop-blur"
                >
                  <Users className="h-4 w-4 text-[#00E0FF]" />
                  <div>
                    <p className="font-medium">Built for small & growing teams</p>
                    <p className="text-[11px] text-slate-500">From 3 teammates to 3000 without changing tools.</p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.section>

          <ScrollStack cards={scrollStackCards} backgroundColor="bg-white" />

          {/* features */}
          <motion.section
            id="features"
            ref={featuresRef}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
            className="mt-20 space-y-8 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.04)] backdrop-blur"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  id="features-heading"
                  className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
                >
                  UDAAN DMS: Your Document Solution
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-600">
                  UDAAN DMS is a powerful tool that helps you organize, secure, and find your documents in one place.
                </p>
              </div>
              <div className="flex gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Role‑based access
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  <Shield className="h-3 w-3 text-sky-600" />
                  Audit & analytics
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Shield}
                title="Security that doesn't blink"
                description="Lock down documents with roles, per‑organization isolation, and every critical action logged."
              />
              <FeatureCard
                icon={Search}
                title="Search that actually finds"
                description="Search across names and metadata so the right document is always a few keystrokes away."
              />
              <FeatureCard
                icon={BarChart3}
                title="See everything, not just files"
                description="Dashboards show document volume, activity, and who's using the system in real time."
              />
              <FeatureCard
                icon={Users}
                title="Built for teams, not individuals"
                description="Onboard teammates with the right permissions on day one and keep everyone in the same workspace."
              />
            </div>
          </motion.section>

          {/* how it works */}
          <motion.section
            id="how-it-works"
            ref={howItWorksRef}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
            className="mt-20 grid gap-8 rounded-3xl border border-slate-100 bg-white/80 p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center shadow-[0_18px_60px_rgba(15,23,42,0.04)] backdrop-blur"
          >
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">From Chaos to Control in 3 Easy Steps</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                UDAAN DMS is designed to be simple, yet powerful. Get started today and see the difference for yourself.
              </p>

              <ol className="mt-6 space-y-4 text-sm">
                <Step
                  step="01"
                  title="Upload Your Files"
                  body="Bring your existing folders and documents into one organized space."
                />
                <Step
                  step="02"
                  title="Invite Your Team"
                  body="Assign roles so everyone has the right access from day one."
                />
                <Step
                  step="03"
                  title="Start Working"
                  body="Begin working with your team in a secure and organized environment."
                />
              </ol>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <Card className="border-slate-200 bg-white backdrop-blur">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Designed for Small Businesses</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    Start small, scale when you're ready.
                  </p>
                  <p className="mt-1 text-[13px] text-slate-600">
                    Works for a 5‑person firm or a 500‑person team without a heavy IT setup.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* why / future proof */}
          <motion.section
            id="why"
            ref={whyRef}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
            className="mt-20 space-y-8 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.04)] backdrop-blur"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Why Choose UDAAN DMS?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-600">
                  UDAAN DMS is designed to meet the needs of small and growing businesses.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ReasonCard
                title="Security-First Foundation"
                body="Encryption, roles, and audit logs are built in from day one."
              />
              <ReasonCard
                title="Ready for AI and Automation"
                body="Clean metadata and APIs make future AI search and workflows easier."
              />
              <ReasonCard
                title="Cloud-Ready, Not Cloud-Locked"
                body="Runs in the cloud without locking you to a single vendor."
              />
            </div>
          </motion.section>

          {/* final CTA */}
          <motion.section
            ref={ctaRef}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
            className="mt-20 rounded-3xl bg-gradient-to-r from-[#00E0FF]/20 via-[#00E0FF]/0 to-[#ff6b35]/20 p-[1px]"
          >
            <div className="rounded-[1.4rem] bg-white px-6 py-8 text-center shadow-xl md:px-10 md:py-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-slate-500">
                UDAAN DMS FOR SMALL & GROWING BUSINESSES
              </p>
              <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Take Control of Your Documents Today
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                UDAAN DMS is the perfect solution for small and growing businesses.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link href="/login">
                  <Button className="rounded-full bg-[#00E0FF] px-6 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:bg-[#0ff0ff]">
                    Get started now
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-[11px] text-slate-500">
                  No credit card required to explore • Built to scale when you're ready
                </p>
              </div>
            </div>
          </motion.section>
        </main>

        {/* footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 md:flex-row">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-medium text-slate-700">UDAAN DMS</span>
              <span className="text-slate-500">— Documents, handled like they matter.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="cursor-default text-slate-500">Terms</span>
              <span className="cursor-default text-slate-500">Contact</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: typeof Shield;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      tabIndex={0}
      aria-label={title}
      whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
      whileFocus={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.8 }}
    >
      <Card className="border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-200/80">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/5">
            <Icon className="h-4 w-4 text-[#00E0FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-[13px] text-slate-600">{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface StepProps {
  step: string;
  title: string;
  body: string;
}

function Step({ step, title, body }: StepProps) {
  return (
    <li className="flex gap-4">
      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-[11px] font-semibold text-slate-900">
        {step}
      </div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-800">{title}</p>
        <p className="mt-1 text-[13px] text-slate-600">{body}</p>
      </div>
    </li>
  );
}

interface ReasonCardProps {
  title: string;
  body: string;
}

function ReasonCard({ title, body }: ReasonCardProps) {
  return (
    <motion.div
      tabIndex={0}
      aria-label={title}
      whileHover={{ y: -3, scale: 1.015 }}
      whileFocus={{ y: -3, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.8 }}
    >
      <Card className="border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-[13px] text-slate-600">{body}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
