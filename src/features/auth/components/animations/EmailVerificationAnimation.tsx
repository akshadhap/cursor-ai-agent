"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Globe2, Mail, Smartphone, Sparkles, Zap, MessageSquare, Database, FileText, Calendar, Users, Workflow, Shield, Phone, TrendingUp } from "lucide-react";
import Image from "next/image";

type Feature = {
  id: string;
  label: string;
  description: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  logoPath?: string;
  angle: number;
  color: string;
  glowColor: string;
};

type Integration = {
  id: string;
  label: string;
  logoPath: string;
  angle: number;
  color: string;
  glowColor: string;
};

const INNER_FEATURES: Feature[] = [
  {
    id: "googleanalytics",
    label: "Google Analytics",
    description: "Web analytics platform",
    logoPath: "/logos/google-analytics.svg",
    angle: 0,
    color: "#F9AB00",
    glowColor: "rgba(249, 171, 0, 0.6)",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Social media platform",
    logoPath: "/logos/facebook.svg",
    angle: 90,
    color: "#1877F2",
    glowColor: "rgba(24, 119, 242, 0.6)",
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Video platform",
    logoPath: "/logos/youtube.svg",
    angle: 180,
    color: "#FF0000",
    glowColor: "rgba(255, 0, 0, 0.6)",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Professional network",
    logoPath: "/logos/linkedin.svg",
    angle: 270,
    color: "#0A66C2",
    glowColor: "rgba(10, 102, 194, 0.6)",
  },
];

const OUTER_INTEGRATIONS: Integration[] = [
  {
    id: "slack",
    label: "Slack",
    logoPath: "/logos/slack.svg",
    angle: 0,
    color: "#4A154B",
    glowColor: "rgba(74, 21, 75, 0.6)",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    logoPath: "/logos/hubspot.svg",
    angle: 33,
    color: "#FF7A59",
    glowColor: "rgba(255, 122, 89, 0.6)",
  },
  {
    id: "notion",
    label: "Notion",
    logoPath: "/logos/notion.svg",
    angle: 66,
    color: "#000000",
    glowColor: "rgba(100, 100, 100, 0.6)",
  },
  {
    id: "github",
    label: "GitHub",
    logoPath: "/logos/github.svg",
    angle: 99,
    color: "#ffffff",
    glowColor: "rgba(255, 255, 255, 0.6)",
  },
  {
    id: "zoom",
    label: "Zoom",
    logoPath: "/logos/zoom.svg",
    angle: 132,
    color: "#2D8CFF",
    glowColor: "rgba(45, 140, 255, 0.6)",
  },
  {
    id: "pos",
    label: "POS",
    logoPath: "/logos/clover.svg",
    angle: 165,
    color: "#FF6B00",
    glowColor: "rgba(255, 107, 0, 0.6)",
  },
  {
    id: "stripe",
    label: "Stripe",
    logoPath: "/logos/stripe.svg",
    angle: 198,
    color: "#635BFF",
    glowColor: "rgba(99, 91, 255, 0.6)",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    logoPath: "/logos/salesforce.png",
    angle: 231,
    color: "#00A1E0",
    glowColor: "rgba(0, 161, 224, 0.6)",
  },
  {
    id: "discord",
    label: "Discord",
    logoPath: "/logos/discord.svg",
    angle: 264,
    color: "#5865F2",
    glowColor: "rgba(88, 101, 242, 0.6)",
  },
  {
    id: "googleworkspace",
    label: "Google Workspace",
    logoPath: "/logos/google-workspace.png",
    angle: 297,
    color: "#34A853",
    glowColor: "rgba(52, 168, 83, 0.6)",
  },
  {
    id: "openai",
    label: "OpenAI",
    logoPath: "/logos/openai.svg",
    angle: 330,
    color: "#10A37F",
    glowColor: "rgba(16, 163, 127, 0.6)",
  },
];

const ANALYTICS_RING: Integration[] = [];

function getPosition(angle: number, radius: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

const BeamPath = ({
  startX,
  startY,
  endX,
  endY,
  color,
  duration,
  uniqueId,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  duration: number;
  uniqueId: number;
}) => (
  <motion.path
    key={`path-${uniqueId}`}
    d={`M ${startX} ${startY} L ${endX} ${endY}`}
    stroke={color}
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    initial={{ pathLength: 0, opacity: 0.4 }}
    animate={{
      pathLength: [0, 1],
      opacity: [0.4, 1, 0],
    }}
    transition={{
      duration: duration,
      ease: "linear",
      opacity: { duration: 0.1, delay: duration - 0.1 },
    }}
    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
  />
);

const BeamPacket = ({
  startX,
  startY,
  endX,
  endY,
  color,
  duration,
  uniqueId,
  Icon,
  logoPath,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  duration: number;
  uniqueId: number;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  logoPath?: string;
}) => (
  <motion.div
    key={`packet-${uniqueId}`}
    className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20"
    style={{
      marginLeft: -24,
      marginTop: -24,
      left: "50%",
      top: "50%",
    }}
    initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
    animate={{
      x: endX,
      y: endY,
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 1, 0.5],
    }}
    transition={{ duration: duration, ease: "linear" }}
  >
    {/* Glow/Trail */}
    <div
      className="absolute -inset-1.5 rounded-full blur-lg opacity-80 animate-pulse"
      style={{ backgroundColor: color }}
    />

    {/* Core with Icon or Logo */}
    <div
      className="w-8 h-8 rounded-full z-10 flex items-center justify-center relative"
      style={{
        backgroundColor: logoPath ? "#ffffff" : color,
        boxShadow: `0 0 20px ${color}`,
      }}
    >
      {logoPath ? (
        <Image src={logoPath} alt="" width={20} height={20} className="object-contain" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-white" />
      ) : null}
    </div>
  </motion.div>
);

const IntegrationPacket = ({
  startX,
  startY,
  endX,
  endY,
  color,
  duration,
  uniqueId,
  logoPath,
  Icon,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  duration: number;
  uniqueId: number;
  logoPath?: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) => (
  <motion.div
    key={`packet-${uniqueId}`}
    className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20"
    style={{
      marginLeft: -24,
      marginTop: -24,
      left: "50%",
      top: "50%",
    }}
    initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
    animate={{
      x: endX,
      y: endY,
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 1, 0.5],
    }}
    transition={{ duration: duration, ease: "linear" }}
  >
    {/* Glow/Trail */}
    <div
      className="absolute -inset-1.5 rounded-full blur-lg opacity-80 animate-pulse"
      style={{ backgroundColor: color }}
    />

    {/* Core with Logo or Icon */}
    <div
      className="w-8 h-8 rounded-full z-10 flex items-center justify-center relative bg-white"
      style={{
        boxShadow: `0 0 20px ${color}`,
      }}
    >
      {logoPath ? (
        <Image src={logoPath} alt="" width={20} height={20} className="object-contain" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-slate-700" />
      ) : null}
    </div>
  </motion.div>
);

const FeatureNode = ({
  feature,
  cx,
  cy,
  isActive,
}: {
  feature: Feature;
  cx: number;
  cy: number;
  isActive: boolean;
}) => {
  const Icon = feature.icon;

  return (
    <div
      className="absolute flex items-center justify-center z-20"
      style={{
        left: `calc(50% + ${cx}px)`,
        top: `calc(50% + ${cy}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Impact Ripple */}
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: feature.color }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 2.8, borderWidth: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl opacity-70"
              style={{ backgroundColor: feature.color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.6, scale: 1.8 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* The Icon Container */}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-white dark:bg-white border overflow-hidden z-10 transition-all duration-500"
        style={{
          width: 64,
          height: 64,
          borderColor: isActive ? feature.color : "rgba(148,163,184,0.2)",
          boxShadow: isActive ? `0 0 35px ${feature.glowColor}` : "none",
        }}
        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
      >
        {/* Active Fill Background */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: feature.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isActive ? 0.2 : 0 }}
        />

        {/* Icon or Logo */}
        <motion.div
          className="transition-all duration-500"
          animate={{
            opacity: isActive ? 1 : 0.4,
            scale: isActive ? 1 : 0.7,
          }}
        >
          {feature.logoPath ? (
            <Image 
              src={feature.logoPath} 
              alt={feature.label} 
              width={32} 
              height={32} 
              className="relative z-10 object-contain"
            />
          ) : Icon ? (
            <Icon className="w-7 h-7 text-slate-700 dark:text-white" />
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
};

const IntegrationNode = ({
  integration,
  cx,
  cy,
  isActive,
}: {
  integration: Integration;
  cx: number;
  cy: number;
  isActive: boolean;
}) => {
  return (
    <div
      className="absolute flex items-center justify-center z-20"
      style={{
        left: `calc(50% + ${cx}px)`,
        top: `calc(50% + ${cy}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Impact Ripple */}
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: integration.color }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 2.8, borderWidth: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl opacity-70"
              style={{ backgroundColor: integration.color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.6, scale: 1.8 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* The Icon Container */}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-white dark:bg-white border overflow-hidden z-10 transition-all duration-500"
        style={{
          width: 56,
          height: 56,
          borderColor: isActive ? integration.color : "rgba(148,163,184,0.2)",
          boxShadow: isActive ? `0 0 35px ${integration.glowColor}` : "none",
        }}
        animate={isActive ? { scale: 1.15 } : { scale: 1 }}
      >
        {/* Active Fill Background */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: integration.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isActive ? 0.15 : 0 }}
        />

        {/* Logo */}
        <motion.div
          className="transition-all duration-500"
          animate={{
            opacity: isActive ? 1 : 0.5,
            scale: isActive ? 1 : 0.8,
          }}
        >
          <Image 
            src={integration.logoPath} 
            alt={integration.label} 
            width={integration.id === 'googleworkspace' ? 36 : 28} 
            height={integration.id === 'googleworkspace' ? 36 : 28} 
            className="relative z-10 object-contain"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

const OrbitVisual = () => {
  const [activeInnerNodes, setActiveInnerNodes] = useState<Set<string>>(new Set());
  const [activeOuterNodes, setActiveOuterNodes] = useState<Set<string>>(new Set());
  const [activeAnalyticsNodes, setActiveAnalyticsNodes] = useState<Set<string>>(new Set());
  const [firingInnerNodes, setFiringInnerNodes] = useState<Set<string>>(new Set());
  const [firingOuterNodes, setFiringOuterNodes] = useState<Set<string>>(new Set());
  const [firingAnalyticsNodes, setFiringAnalyticsNodes] = useState<Set<string>>(new Set());
  const [fireKey, setFireKey] = useState(0);

  const travelTime = 1.0;
  const innerRadius = 120;
  const outerRadius = 200;
  const analyticsRadius = 270;

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const sequence = async () => {
      if (!isMounted) return;

      // Reset
      setActiveInnerNodes(new Set());
      setActiveOuterNodes(new Set());
      setActiveAnalyticsNodes(new Set());
      setFiringInnerNodes(new Set());
      setFiringOuterNodes(new Set());
      setFiringAnalyticsNodes(new Set());

      // Fire inner ring
      for (let i = 0; i < INNER_FEATURES.length; i++) {
        if (!isMounted) return;
        const feature = INNER_FEATURES[i];
        setFireKey((prev) => prev + 1);
        setFiringInnerNodes(new Set([feature.id]));
        await new Promise((r) => setTimeout(r, travelTime * 1000));
        if (!isMounted) return;
        setFiringInnerNodes(new Set());
        setActiveInnerNodes((prev) => new Set([...prev, feature.id]));
        await new Promise((r) => setTimeout(r, 300));
      }

      // Fire outer ring
      for (let i = 0; i < OUTER_INTEGRATIONS.length; i++) {
        if (!isMounted) return;
        const integration = OUTER_INTEGRATIONS[i];
        setFireKey((prev) => prev + 1);
        setFiringOuterNodes(new Set([integration.id]));
        await new Promise((r) => setTimeout(r, travelTime * 1000));
        if (!isMounted) return;
        setFiringOuterNodes(new Set());
        setActiveOuterNodes((prev) => new Set([...prev, integration.id]));
        await new Promise((r) => setTimeout(r, 200));
      }

      // Fire analytics ring
      for (let i = 0; i < ANALYTICS_RING.length; i++) {
        if (!isMounted) return;
        const analytics = ANALYTICS_RING[i];
        setFireKey((prev) => prev + 1);
        setFiringAnalyticsNodes(new Set([analytics.id]));
        await new Promise((r) => setTimeout(r, travelTime * 1000));
        if (!isMounted) return;
        setFiringAnalyticsNodes(new Set());
        setActiveAnalyticsNodes((prev) => new Set([...prev, analytics.id]));
        await new Promise((r) => setTimeout(r, 200));
      }

      // Hold all active
      await new Promise((r) => setTimeout(r, 2000));
      
      // Schedule next sequence
      if (isMounted) {
        timeoutId = setTimeout(sequence, 18000);
      }
    };

    sequence();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05),transparent_60%)] pointer-events-none" />

      {/* Inner Orbit Ring */}
      <motion.div
        className="absolute rounded-full border z-0"
        style={{ width: 240, height: 240 }}
        animate={{
          borderColor:
            activeInnerNodes.size > 0 ? "rgba(168, 85, 247, 0.4)" : "rgba(148,163,184,0.15)",
          boxShadow:
            activeInnerNodes.size > 0 ? "0 0 50px rgba(168, 85, 247, 0.2)" : "none",
          scale: activeInnerNodes.size > 0 ? 1.02 : 1,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Outer Orbit Ring */}
      <motion.div
        className="absolute rounded-full border border-dashed z-0"
        style={{ width: 400, height: 400 }}
        animate={{
          borderColor:
            activeOuterNodes.size > 0 ? "rgba(99, 102, 241, 0.4)" : "rgba(148,163,184,0.1)",
          boxShadow:
            activeOuterNodes.size > 0 ? "0 0 50px rgba(99, 102, 241, 0.15)" : "none",
          scale: activeOuterNodes.size > 0 ? 1.01 : 1,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Central Hub */}
      <div className="relative z-30 w-20 h-20 rounded-full bg-white dark:bg-black border border-purple-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.25)]">
        <div className="absolute inset-0 bg-purple-500/15 rounded-full animate-pulse" />
        <Image 
          src="/logo.png" 
          alt="Logo" 
          width={36} 
          height={36} 
          className="relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" 
        />

        {/* Rotating Rings */}
        <div className="absolute -inset-2 rounded-full border border-purple-500/30 border-t-transparent animate-[spin_6s_linear_infinite]" />
        <div className="absolute -inset-4 rounded-full border border-dashed border-purple-500/20 animate-[spin_12s_linear_infinite_reverse]" />

        {/* Firing Shockwave */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-purple-500/60"
          animate={{
            scale: (firingInnerNodes.size > 0 || firingOuterNodes.size > 0 || firingAnalyticsNodes.size > 0) ? [1, 2.2] : 1,
            opacity: (firingInnerNodes.size > 0 || firingOuterNodes.size > 0 || firingAnalyticsNodes.size > 0) ? [1, 0] : 0,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* SVG Layer: Beam Trails */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
        <g transform="translate(50%, 50%)">
          {/* Inner Ring Beams */}
          {INNER_FEATURES.map((feature) => {
            const pos = getPosition(feature.angle, innerRadius);
            return (
              <g key={`beam-group-inner-${feature.id}`}>
              </g>
            );
          })}
          {/* Outer Ring Beams */}
          {OUTER_INTEGRATIONS.map((integration) => {
            const pos = getPosition(integration.angle, outerRadius);
            return (
              <g key={`beam-group-outer-${integration.id}`}>
              </g>
            );
          })}
          {/* Analytics Ring Beams */}
          {ANALYTICS_RING.map((analytics) => {
            const pos = getPosition(analytics.angle, analyticsRadius);
            return (
              <g key={`beam-group-analytics-${analytics.id}`}>
              </g>
            );
          })}
        </g>
      </svg>

      {/* HTML Layer: Traveling Packets */}
      <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center z-15">
        {/* Inner Ring Packets */}
        {INNER_FEATURES.map((feature) => {
          const pos = getPosition(feature.angle, innerRadius);
          return (
            firingInnerNodes.has(feature.id) && (
              <BeamPacket
                key={`packet-inner-${feature.id}-${fireKey}`}
                startX={0}
                startY={0}
                endX={pos.x}
                endY={pos.y}
                color={feature.color}
                duration={travelTime}
                uniqueId={fireKey}
                Icon={feature.icon}
                logoPath={feature.logoPath}
              />
            )
          );
        })}
        {/* Outer Ring Packets */}
        {OUTER_INTEGRATIONS.map((integration) => {
          const pos = getPosition(integration.angle, outerRadius);
          return (
            firingOuterNodes.has(integration.id) && (
              <IntegrationPacket
                key={`packet-outer-${integration.id}-${fireKey}`}
                startX={0}
                startY={0}
                endX={pos.x}
                endY={pos.y}
                color={integration.color}
                duration={travelTime}
                uniqueId={fireKey}
                logoPath={integration.logoPath}
              />
            )
          );
        })}
        {/* Analytics Ring Packets */}
        {ANALYTICS_RING.map((analytics) => {
          const pos = getPosition(analytics.angle, analyticsRadius);
          return (
            firingAnalyticsNodes.has(analytics.id) && (
              <IntegrationPacket
                key={`packet-analytics-${analytics.id}-${fireKey}`}
                startX={0}
                startY={0}
                endX={pos.x}
                endY={pos.y}
                color={analytics.color}
                duration={travelTime}
                uniqueId={fireKey}
                logoPath={analytics.logoPath}
              />
            )
          );
        })}
      </div>

      {/* Inner Feature Nodes */}
      {INNER_FEATURES.map((feature) => {
        const pos = getPosition(feature.angle, innerRadius);
        return (
          <FeatureNode
            key={feature.id}
            feature={feature}
            cx={pos.x}
            cy={pos.y}
            isActive={activeInnerNodes.has(feature.id)}
          />
        );
      })}

      {/* Outer Integration Nodes */}
      {OUTER_INTEGRATIONS.map((integration) => {
        const pos = getPosition(integration.angle, outerRadius);
        return (
          <IntegrationNode
            key={integration.id}
            integration={integration}
            cx={pos.x}
            cy={pos.y}
            isActive={activeOuterNodes.has(integration.id)}
          />
        );
      })}

      {/* Analytics Ring Nodes */}
      {ANALYTICS_RING.map((analytics) => {
        const pos = getPosition(analytics.angle, analyticsRadius);
        return (
          <IntegrationNode
            key={analytics.id}
            integration={analytics}
            cx={pos.x}
            cy={pos.y}
            isActive={activeAnalyticsNodes.has(analytics.id)}
          />
        );
      })}
    </div>
  );
};

export function EmailVerificationAnimation() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <h3 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-rose-600 dark:from-purple-400 dark:via-pink-400 dark:to-rose-400 bg-clip-text text-transparent tracking-tight">
          Unlock your AI Workspace
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
          Pipe one prompt into websites, email classifiers, automations & mobile apps—all connected in real-time.
        </p>
      </motion.div>

      {/* Orbit Visualization */}
      <div className="relative h-[550px] rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-linear-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 shadow-2xl overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.15),transparent_60%)] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.1),transparent_60%)] opacity-70" />

        <OrbitVisual />
      </div>
    </div>
  );
}
