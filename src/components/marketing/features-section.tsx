import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  DollarSign,
  DoorOpen,
  PhoneCall,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Live metrics on your campaign's momentum, all in one view.",
  },
  {
    icon: Users,
    title: "Voters",
    description: "A searchable voter database built for door-to-door outreach.",
  },
  {
    icon: HeartHandshake,
    title: "Volunteers",
    description: "Track who's helping, what they've signed up for, and follow up.",
  },
  {
    icon: DollarSign,
    title: "Donors",
    description: "Keep contributions organized and see progress toward your goal.",
  },
  {
    icon: DoorOpen,
    title: "Canvassing",
    description: "Plan turf, log door knocks, and see coverage in real time.",
  },
  {
    icon: PhoneCall,
    title: "Phone Banking",
    description: "Run call lists and record outcomes without a third-party tool.",
  },
  {
    icon: CalendarDays,
    title: "Events",
    description: "Coordinate rallies, meet-and-greets, and volunteer shifts.",
  },
  {
    icon: ListTodo,
    title: "Tasks",
    description: "Assign and track the work that keeps a campaign moving.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-semibold tracking-tight">
          Everything a local campaign needs
        </h2>
        <p className="text-muted-foreground mt-3">
          Eight focused modules, built for the way small campaigns actually run.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
                <feature.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
