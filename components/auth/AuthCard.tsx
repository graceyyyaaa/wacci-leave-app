import { Card, CardContent } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-xl border border-slate-200 bg-white shadow-xl">
      <CardContent className="p-8 md:p-10">
        {/* WACCI Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-24 w-44 items-center justify-center overflow-hidden rounded-xl bg-white">
            <img
              src="/waccilogo.svg"
              alt="West Africa Centre for Crop Improvement"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>

        {/* Description */}
        <p className="mb-7 mt-2 text-slate-500">{description}</p>

        {/* Form */}
        {children}
      </CardContent>
    </Card>
  );
}
