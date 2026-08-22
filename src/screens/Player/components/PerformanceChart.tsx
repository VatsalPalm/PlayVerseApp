import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface PerformanceChartProps {
  data: number[]; // e.g. [60, 65, 55, 75, 80, 85] represent win rates or ratings
  labels: string[]; // e.g. ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  width?: number;
  height?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data = [50, 60, 55, 70, 65, 80],
  labels = ["M1", "M2", "M3", "M4", "M5", "M6"],
  width = Dimensions.get("window").width - 56, // default responsive width
  height = 160,
}) => {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data, 100);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const padding = 20;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  // Map values to coordinates
  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, val };
  });

  // Generate SVG Path for Line (using simple bezier curves or lines)
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    // bezier curve control points
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  // Generate SVG Path for Gradient Fill
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00D2FF" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#00D2FF" stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Gradient Area under line */}
        <Path d={fillPath} fill="url(#chartGrad)" />

        {/* Trend Line */}
        <Path d={linePath} fill="none" stroke="#00D2FF" strokeWidth={3} />

        {/* Interactive / static circles for data points */}
        {points.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={5}
            fill="#120E2E"
            stroke="#00D2FF"
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* X Axis Labels */}
      <View style={[styles.labelsRow, { width, paddingHorizontal: padding }]}>
        {labels.map((lbl, idx) => (
          <Text key={idx} style={styles.labelText}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default PerformanceChart;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 10,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  labelText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontWeight: "600",
  },
});
