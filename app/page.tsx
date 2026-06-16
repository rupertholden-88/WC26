import Header from "@/app/components/Header";
import Dashboard from "@/app/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <Header />
      <Dashboard />
    </main>
  );
}
