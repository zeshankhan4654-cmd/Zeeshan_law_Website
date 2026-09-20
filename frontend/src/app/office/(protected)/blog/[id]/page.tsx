import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { PostEditor } from "../PostEditor";

type Post = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
  published: boolean;
  coverName: string;
};

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // "new" is a route here rather than a separate folder, so the editor is
  // one component with one set of behaviour.
  if (id === "new") {
    return (
      <>
        <Link href="/office/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold">
          <ArrowLeft className="size-4" /> Writing
        </Link>
        <PageHeading title="Write an article" subtitle="A cover photo can be added once it is created." />
        <PostEditor />
      </>
    );
  }

  const postId = Number(id);
  if (!Number.isInteger(postId) || postId < 1) return <NotPermitted />;

  const post = await officeFetch<Post>(`/api/office/posts/${postId}`);
  if (!post) return <NotPermitted />;

  return (
    <>
      <Link href="/office/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold">
        <ArrowLeft className="size-4" /> Writing
      </Link>
      <PageHeading title={post.title} subtitle={post.published ? "On the website" : "Draft"} />
      <PostEditor id={post.id} initial={post} coverName={post.coverName} />
    </>
  );
}
