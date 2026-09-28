import LeaveDetailsClient from "./LeaveDetailsClient";

type PageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function LeaveDetailsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestId = params.id ?? "";

  return <LeaveDetailsClient requestId={requestId} />;
}
