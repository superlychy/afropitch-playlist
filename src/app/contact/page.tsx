import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { siteConfig } from "@/../config/site";

export default function ContactPage() {
    return (
        <div className="w-full mx-auto max-w-lg px-4 py-16 md:py-24">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
                <p className="text-gray-400">Have questions about your submission?</p>
            </div>

            <Card className="border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <CardDescription>We typically reply within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="Submission Inquiry" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <textarea
                            id="message"
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                            placeholder="How can we help?"
                        />
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                        Send Message
                    </Button>

                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Mail className="w-4 h-4" />
                        <span>or email us at {siteConfig.contact.email}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
