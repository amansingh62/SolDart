import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

export async function DELETE(request: Request) {
    try {
        // Get the authenticated user session
        const session = await getServerSession(authOptions);

        // Check if user is authenticated
        if (!session?.user?.email || !session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        try {
            // Use a transaction to ensure all deletions succeed or fail together
            await prisma.$transaction(async (tx: PrismaClient) => {
                // Delete user's posts
                await tx.post.deleteMany({
                    where: { userId }
                });

                // Delete user's comments
                await tx.comment.deleteMany({
                    where: { userId }
                });

                // Delete user's likes
                await tx.like.deleteMany({
                    where: { userId }
                });

                // Delete user's messages (both sent and received)
                await tx.message.deleteMany({
                    where: {
                        OR: [
                            { senderId: userId },
                            { receiverId: userId }
                        ]
                    }
                });

                // Delete user's notifications
                await tx.notification.deleteMany({
                    where: { userId }
                });

                // Delete user's wallet connections
                await tx.walletConnection.deleteMany({
                    where: { userId }
                });

                // Delete user's profile
                await tx.profile.deleteMany({
                    where: { userId }
                });

                // Check for any other related data that might need deletion
                // For example, if there are followers/following relationships
                await tx.follow?.deleteMany?.({
                    where: {
                        OR: [
                            { followerId: userId },
                            { followingId: userId }
                        ]
                    }
                }).catch(() => { }); // Ignore if this table doesn't exist

                // Finally, delete the user account itself
                await tx.user.delete({
                    where: { id: userId }
                });
            });

            // Clear all cookies to ensure user is logged out
            const cookieStore = await cookies();
            const allCookies = await cookieStore.getAll();
            for (const cookie of allCookies) {
                await cookieStore.delete(cookie.name);
            }

            return NextResponse.json(
                { success: true, message: 'Account successfully deleted' },
                { status: 200 }
            );

        } catch (transactionError) {
            console.error('Transaction error during account deletion:', transactionError);
            return NextResponse.json(
                { success: false, message: 'Failed to delete all account data. Please try again.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error in delete account process:', error);
        return NextResponse.json(
            { success: false, message: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}