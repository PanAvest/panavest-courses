import { redirect } from "next/navigation";
export default function CoursesSlugRedirect({ params }: { params: { slug: string } }) {
  redirect(`/knowledge/${params.slug}`);
}
