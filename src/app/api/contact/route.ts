
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email, subject, message } = await request.json();

        const { data, error } = await resend.emails.send({
            from: 'AfroPitch Contact <contact@afropitchplay.best>',
            to: ['superlychy@gmail.com'], // Or site admin email
            subject: `Contact Form: ${subject}`,
            html: `
        <h1>New Message from Contact Form</h1>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
            replyTo: email
        });

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
