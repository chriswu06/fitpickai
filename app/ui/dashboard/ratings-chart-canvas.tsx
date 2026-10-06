"use client";

import {useEffect, useRef} from "react";
import {PersonalRatingsTrend} from "@/app/lib/definitions";
import {formatDateToLocal} from "@/app/lib/utils";
import {Chart as ChartJS, ChartConfiguration, registerables} from "chart.js";

ChartJS.register(...registerables);

const COLORS = [
  { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.5)' },
  { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.5)' },
  { border: 'rgb(255, 206, 86)', bg: 'rgba(255, 206, 86, 0.5)' },
  { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.5)' },
  { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.5)' },
  { border: 'rgb(255, 159, 64)', bg: 'rgba(255, 159, 64, 0.5)' },
];

export default function RatingsChartCanvas({data}: {data: PersonalRatingsTrend[]}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartJS | null>(null);
    useEffect(() => {
        if (!canvasRef.current) return;
        const allDatesSet = new Set<string>();
        data.forEach(outfit => {
            outfit.ratings.forEach(rating => {
                allDatesSet.add(rating.date);
            })
        });
        const sortedDates = Array.from(allDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const xAxisLabels = sortedDates.map(date => {
            return formatDateToLocal(date);
        });
        const datasets = data.map((outfit, index) => {
            const ratingMap = new Map<string, number>();
            outfit.ratings.forEach(rating => {
                ratingMap.set(rating.date, rating.rating);
            });
            const mappedData = sortedDates.map(date => ratingMap.get(date) ?? null);
            const color = COLORS[index % COLORS.length];
            return {
                label: outfit.outfit_name,
                data: mappedData,
                borderColor: color.border,
                backgroundColor: color.bg,
                tension: 0.4,
                spanGaps: true
            };
        });
        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: xAxisLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animations: {
                radius: {
                    duration: 400,
                    easing: 'linear',
                    loop: (context) => context.active
                }
                },
                elements: {
                    point: {
                        hoverRadius: 12,
                        hoverBackgroundColor: 'pink',
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                plugins: {
                    tooltip: {
                        enabled: true
                    },
                    legend: {
                        display: true,
                        position: "top"
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            },
        };
        if (chartRef.current) {
            chartRef.current.destroy();
        }
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            chartRef.current = new ChartJS(ctx, config);
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);
    return (
        <div className = "relative h-[400px] w-full">
            <canvas ref = {canvasRef}></canvas>
        </div>
    );
}
