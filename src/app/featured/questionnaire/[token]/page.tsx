"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FeaturedQuestionnaireForm } from "@/components/FeaturedQuestionnaireForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function QuestionnairePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .rpc("get_featured_questionnaire", { p_token: token })
            .then(({ data }) => {
                setData(data);
                setLoading(false);
            });
    }, [token]);

    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            {loading ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 py-20">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading your feature…
                </div>
            ) : !data ? (
                <Card className="border-white/10 bg-white/5 max-w-xl mx-auto">
                    <CardContent className="pt-10 pb-10 text-center space-y-4">
                        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
                        <h1 className="text-xl font-bold text-white">This link isn't valid</h1>
                        <p className="text-gray-400 text-sm">
                            The questionnaire link may have expired or already been used.
                            If you believe this is a mistake, reply to the message we sent you.
                        </p>
                        <Link href="/">
                            <Button variant="outline" className="border-white/15 rounded-xl">
                                Back to AfroPitch
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : data.status !== "draft" ? (
                <Card className="border-white/10 bg-white/5 max-w-xl mx-auto">
                    <CardContent className="pt-10 pb-10 text-center space-y-4">
                        <h1 className="text-xl font-bold text-white">This feature is already live</h1>
                        <p className="text-gray-400 text-sm">
                            Your answers have been reviewed and published. You can view your feature below.
                        </p>
                        {data.slug ? (
                            <Link href={`/featured/${data.slug}`}>
                                <Button className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                                    View my feature
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/featured">
                                <Button className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl">
                                    View featured artists
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <FeaturedQuestionnaireForm token={token} initial={data} />
            )}
        </main>
    );
}
