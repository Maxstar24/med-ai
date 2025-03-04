'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase(),
  specialization: z.string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(100, 'Specialization must be less than 100 characters')
    .optional(),
  yearOfStudy: z.string()
    .regex(/^[1-7]$/, 'Year of study must be between 1 and 7')
    .optional(),
  institution: z.string()
    .min(2, 'Institution must be at least 2 characters')
    .max(100, 'Institution must be less than 100 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
});

const preferencesSchema = z.object({
  studyReminders: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  darkMode: z.boolean().default(true),
  language: z.string().default('en'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<{
    profile: boolean;
    preferences: boolean;
    initial: boolean;
  }>({
    profile: false,
    preferences: false,
    initial: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadProfileData() {
      try {
        const response = await fetch('/api/user/profile', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to load profile data');
        }

        const data = await response.json();
        profileForm.reset(data);
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error loading profile',
          description: 'Failed to load your profile data. Please refresh the page.',
        });
      }
    }

    async function loadPreferences() {
      try {
        const response = await fetch('/api/user/preferences', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to load preferences');
        }

        const data = await response.json();
        preferencesForm.reset(data);
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast({
          variant: 'destructive',
          title: 'Error loading preferences',
          description: 'Failed to load your preferences. Please refresh the page.',
        });
      } finally {
        setIsLoading(prev => ({ ...prev, initial: false }));
      }
    }

    if (status === 'authenticated') {
      loadProfileData();
      loadPreferences();
    }
  }, [status]);

  if (status === 'loading' || isLoading.initial) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      specialization: '',
      yearOfStudy: '',
      institution: '',
      bio: '',
    },
  });

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      studyReminders: true,
      emailNotifications: true,
      darkMode: true,
      language: 'en',
    },
  });

  async function onProfileSubmit(values: ProfileFormValues) {
    try {
      setIsLoading(prev => ({ ...prev, profile: true }));
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const data = await response.json();
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
        variant: 'default',
      });

      router.refresh();
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, profile: false }));
    }
  }

  async function onPreferencesSubmit(values: PreferencesFormValues) {
    try {
      setIsLoading(prev => ({ ...prev, preferences: true }));
      
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }

      const data = await response.json();
      
      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been updated successfully',
        variant: 'default',
      });

      router.refresh();
    } catch (error) {
      console.error('Preferences update error:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating preferences',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, preferences: false }));
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Profile picture" />
            <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Your medical specialization or area of focus
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="yearOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Study</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading.profile}>
                  {isLoading.profile ? (
                    <>
                      <span className="mr-2">Saving...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Form {...preferencesForm}>
              <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-4">
                <FormField
                  control={preferencesForm.control}
                  name="studyReminders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable study reminders</FormLabel>
                        <FormDescription>
                          Receive notifications for your study schedule and goals
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="emailNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Receive email notifications</FormLabel>
                        <FormDescription>
                          Get email updates about your learning progress and achievements
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading.preferences}>
                  {isLoading.preferences ? (
                    <>
                      <span className="mr-2">Saving...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    'Save preferences'
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Security Settings</h2>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/reset-password/request')}
                >
                  Change Password
                </Button>
                <p className="text-sm text-muted-foreground">
                  Update your password to keep your account secure
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 