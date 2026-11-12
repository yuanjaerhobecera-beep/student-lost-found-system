// Registers only the Chart.js parts we use (keeps the app smaller)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export const CHART_COLORS = {
  lost: "#dc3545",
  found: "#0d6efd",
  released: "#198754",
  palette: ["#0d6efd", "#ffc107", "#0dcaf0", "#dc3545", "#198754", "#212529", "#6c757d", "#6610f2"],
};
