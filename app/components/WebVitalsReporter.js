"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WebVitals]", metric.name, metric.value, metric.rating, metric.id);
    }
  });
  return null;
}
