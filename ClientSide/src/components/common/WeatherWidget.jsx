import { CloudRain, Droplets, MapPin, Thermometer, Wind } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Animated counter for temperature
const AnimatedTemp = ({ value, prefersReducedMotion }) => {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);

    useEffect(() => {
        if (prefersReducedMotion || value === null || value === undefined) {
            setDisplay(value);
            return;
        }

        const from = prevRef.current ?? value;
        const to = value;
        prevRef.current = to;

        if (from === to) {
            setDisplay(to);
            return;
        }

        const duration = 600;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + (to - from) * eased;
            setDisplay(Math.round(current));

            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [value, prefersReducedMotion]);

    return <>{display !== null && display !== undefined ? display : "--"}</>;
};

const WeatherWidget = () => {
    const prefersReducedMotion = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);
    const [weather, setWeather] = useState(null);

    const [time, setTime] = useState(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    );
    
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(
                new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            );
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchWeather = async () => {
        try {
            const res = await fetch(
                "https://api.openweathermap.org/data/2.5/weather?lat=10.6956953&lon=106.7395591&appid=23ab1814bb3199a48b4ebd7b307bc7ec&units=metric&lang=vi"
            );
            const data = await res.json();
            setWeather(data);
        } catch (err) {
            console.error("Fetch weather error:", err);
        }
    };

    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6;

    // Dynamic gradient based on time of day
    const gradientStyle = useMemo(() => {
        if (isNight) {
            return {
                background: "linear-gradient(135deg, rgba(30, 41, 89, 0.85) 0%, rgba(44, 62, 120, 0.75) 50%, rgba(25, 32, 72, 0.85) 100%)",
            };
        }
        return {
            background: "linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(147, 197, 253, 0.12) 50%, rgba(191, 219, 254, 0.18) 100%)",
        };
    }, [isNight]);

    const textColor = isNight ? "text-blue-100" : "text-slate-700";
    const mutedColor = isNight ? "text-blue-200/80" : "text-slate-500";
    const tempColor = isNight ? "text-white" : "text-[#4E5BA6]";
    const borderColor = isNight
        ? "border-white/15"
        : "border-[#4E5BA6]/15";
    const iconColor = isNight ? "text-blue-200" : "text-[#4E5BA6]";

    const temp = weather?.main?.temp !== undefined ? Math.round(weather.main.temp) : null;
    const description = weather?.weather?.[0]?.description || "";
    const humidity = weather?.main?.humidity;
    const windSpeed = weather?.wind?.speed;
    const iconCode = weather?.weather?.[0]?.icon;

    // Floating animation for weather icon
    const floatVariants = prefersReducedMotion
        ? {}
        : {
            animate: {
                y: [-1.5, 1.5, -1.5],
                transition: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                },
            },
        };

    // Hover expand variants
    const expandVariants = {
        collapsed: {
            width: 0,
            opacity: 0,
            marginLeft: 0,
        },
        expanded: {
            width: "auto",
            opacity: 1,
            marginLeft: 8,
            transition: {
                width: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
                opacity: { duration: 0.25, delay: 0.1 },
            },
        },
        exit: {
            width: 0,
            opacity: 0,
            marginLeft: 0,
            transition: {
                opacity: { duration: 0.15 },
                width: { duration: 0.25, delay: 0.05 },
            },
        },
    };

    return (
        <motion.div
            id="weather-widget"
            className={`
                relative h-full rounded-xl cursor-pointer select-none
                flex items-center gap-1.5 px-3
                backdrop-blur-md
                border ${borderColor}
                shadow-sm
                transition-shadow duration-300
                overflow-hidden
            `}
            style={gradientStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
                opacity: 1,
                scale: 1,
                boxShadow: isHovered
                    ? isNight
                        ? "0 4px 24px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(147, 197, 253, 0.1)"
                        : "0 4px 24px rgba(78, 91, 166, 0.15), 0 0 0 1px rgba(78, 91, 166, 0.08)"
                    : "0 1px 8px rgba(0,0,0,0.06)",
            }}
            transition={{
                opacity: { duration: 0.4 },
                scale: { duration: 0.3, ease: "easeOut" },
                boxShadow: { duration: 0.3 },
            }}
            role="status"
            aria-label={`Thời tiết: ${temp ?? "--"}°C, ${description}`}
        >
            {/* Subtle animated shimmer overlay */}
            {!prefersReducedMotion && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: isNight
                            ? "linear-gradient(90deg, transparent 0%, rgba(147,197,253,0.06) 50%, transparent 100%)"
                            : "linear-gradient(90deg, transparent 0%, rgba(78,91,166,0.04) 50%, transparent 100%)",
                        backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
            )}

            {/* Weather icon — floating animation */}
            <motion.div
                className="h-7 w-7 flex items-center justify-center shrink-0 relative"
                variants={floatVariants}
                animate="animate"
            >
                {iconCode ? (
                    <img
                        src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`}
                        className="h-9 w-9 drop-shadow-md"
                        alt={description || "Weather icon"}
                        draggable={false}
                    />
                ) : (
                    <CloudRain className={`h-5 w-5 ${iconColor} animate-pulse`} />
                )}
            </motion.div>

            {/* Temperature */}
            <div className="flex items-baseline gap-0.5 shrink-0">
                <span className={`text-lg font-semibold tabular-nums tracking-tight ${tempColor}`}>
                    <AnimatedTemp value={temp} prefersReducedMotion={prefersReducedMotion} />
                </span>
                <span className={`text-xs font-medium ${mutedColor}`}>°C</span>
            </div>

            {/* Separator dot */}
            <div className={`w-1 h-1 rounded-full shrink-0 ${isNight ? "bg-blue-300/40" : "bg-[#4E5BA6]/20"}`} />

            {/* Time */}
            <span className={`text-sm font-medium tabular-nums shrink-0 ${textColor}`}>
                {time}
            </span>

            {/* Expandable details on hover */}
            <AnimatePresence mode="wait">
                {isHovered && (
                    <motion.div
                        key="weather-details"
                        className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
                        variants={expandVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="exit"
                    >
                        {/* Separator */}
                        <div className={`w-px h-5 shrink-0 ${isNight ? "bg-blue-300/30" : "bg-[#4E5BA6]/15"}`} />

                        {/* Description */}
                        <span className={`text-sm capitalize shrink-0 ${textColor}`}>
                            {description || "..."}
                        </span>

                        {/* Humidity */}
                        {humidity !== undefined && (
                            <span className={`flex items-center gap-1 text-xs shrink-0 ${mutedColor}`}>
                                <Droplets className="h-3.5 w-3.5" />
                                {humidity}%
                            </span>
                        )}

                        {/* Wind */}
                        {windSpeed !== undefined && (
                            <span className={`flex items-center gap-1 text-xs shrink-0 ${mutedColor}`}>
                                <Wind className="h-3.5 w-3.5" />
                                {windSpeed} m/s
                            </span>
                        )}

                        {/* Location */}
                        <span className={`flex items-center gap-1 text-xs shrink-0 ${mutedColor}`}>
                            <MapPin className="h-3.5 w-3.5" />
                            TP.HCM
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default WeatherWidget;