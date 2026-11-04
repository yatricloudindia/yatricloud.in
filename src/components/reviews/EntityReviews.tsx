import { useCallback, useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/LoginModal";
import { getCachedUser, hasSession } from "@/lib/auth";
import {
    listEntityReviews,
    getMyEntityReview,
    submitEntityReview,
    summarize,
    type EntityReview,
    type ReviewEntityType,
} from "@/lib/entity-reviews";

/**
 * Reusable per-entity review block (events, store products, udemy courses,
 * exam dumps): average + count, the public review list, and a "Write a
 * review" dialog. One review per Yatri per entity, writing again edits it.
 * Event reviews are RLS-gated to registered Yatris; the error message from
 * the API already explains that in friendly words.
 */

const INITIAL_VISIBLE = 4;

export function RatingStars({ value, className = "w-4 h-4" }: { value: number; className?: string }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`${className} ${n <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

interface EntityReviewsProps {
    entityType: ReviewEntityType;
    entityId: string;
    entityName: string;
    /** Shown under the write button when the type has an eligibility rule. */
    gateHint?: string;
    className?: string;
}

export function EntityReviews({ entityType, entityId, entityName, gateHint, className = "" }: EntityReviewsProps) {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<EntityReview[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const [writeOpen, setWriteOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        const list = await listEntityReviews(entityType, entityId);
        setReviews(list);
        setLoaded(true);
    }, [entityType, entityId]);

    useEffect(() => {
        void load();
    }, [load]);

    const openWrite = async () => {
        if (!hasSession()) {
            setLoginOpen(true);
            return;
        }
        const mine = await getMyEntityReview(entityType, entityId);
        if (mine) {
            setRating(mine.rating);
            setText(mine.review);
        }
        setWriteOpen(true);
    };

    const handleSubmit = async () => {
        if (!text.trim()) {
            toast({ title: "Add a few words", description: "Your experience helps other Yatris decide." });
            return;
        }
        setSubmitting(true);
        const { ok, error } = await submitEntityReview({
            entityType,
            entityId,
            name: getCachedUser()?.fullName || getCachedUser()?.email?.split("@")[0] || "A Yatri",
            rating,
            review: text,
        });
        setSubmitting(false);
        if (!ok) {
            toast({ title: "Review not saved", description: error || "Please try again.", variant: "destructive" });
            return;
        }
        toast({ title: "Thank you, Yatri", description: "Your review is live." });
        setWriteOpen(false);
        setText("");
        setRating(5);
        void load();
    };

    const summary = summarize(reviews);
    const visible = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE);

    return (
        <div className={className} data-testid="entity-reviews">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    {summary.count > 0 ? (
                        <>
                            <RatingStars value={summary.average || 0} />
                            <span className="font-semibold">{summary.average}</span>
                            <span className="text-sm text-muted-foreground">
                                · {summary.count} {summary.count === 1 ? "review" : "reviews"}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">
                            {loaded ? "No reviews yet. Be the first to share your experience." : "Loading reviews…"}
                        </span>
                    )}
                </div>
                <Button
                    onClick={openWrite}
                    variant="outline"
                    className="min-h-[44px] rounded-xl hover:bg-brand-50 hover:text-primary"
                    data-testid="entity-review-write"
                >
                    Write a review
                </Button>
            </div>
            {gateHint && <p className="text-xs text-muted-foreground mb-4">{gateHint}</p>}

            {visible.length > 0 && (
                <ul className="space-y-3" data-testid="entity-reviews-list">
                    {visible.map((r) => (
                        <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                <span className="font-semibold text-sm">{r.name}</span>
                                <RatingStars value={r.rating} className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{r.review}</p>
                        </li>
                    ))}
                </ul>
            )}
            {reviews.length > INITIAL_VISIBLE && !showAll && (
                <Button variant="ghost" className="mt-3 min-h-[44px] rounded-xl hover:bg-brand-50 hover:text-primary" onClick={() => setShowAll(true)}>
                    Show all {reviews.length} reviews
                </Button>
            )}

            <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review {entityName}</DialogTitle>
                        <DialogDescription>
                            Honest words help every Yatri choose with confidence.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="mb-2 block">Your rating</Label>
                            <div className="flex gap-1.5" role="radiogroup" aria-label="Rating out of 5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={rating === n}
                                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                                        data-testid={`entity-review-rating-${n}`}
                                        onClick={() => setRating(n)}
                                        className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <Star className={`w-7 h-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="entity-review-text" className="mb-2 block">Your review</Label>
                            <Textarea
                                id="entity-review-text"
                                data-testid="entity-review-text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="What stood out? What should other Yatris know?"
                                className="min-h-[110px]"
                                disabled={submitting}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 min-h-[44px] rounded-xl" onClick={() => setWriteOpen(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button className="flex-1 min-h-[44px] rounded-xl" onClick={handleSubmit} disabled={submitting} data-testid="entity-review-submit">
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending
                                    </>
                                ) : (
                                    "Submit review"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <LoginModal
                isOpen={loginOpen}
                onClose={() => setLoginOpen(false)}
                onSuccess={() => {
                    setLoginOpen(false);
                    void openWrite();
                }}
            />
        </div>
    );
}
