"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, GraduationCap, BookOpen, Clock, MapPin, Camera, Upload } from "lucide-react";
import { createClient } from "../../supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { X, Plus } from "lucide-react";
import { PROFILE_USER_UPDATED_EVENT } from "./user-profile";
import {
  STUDY_STYLE_OPTIONS,
  normalizeStudyStyles,
} from "@/lib/studyPreferenceOptions";

interface ProfileViewProps {
  userId: string;
}

export default function ProfileView({ userId }: ProfileViewProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingClasses, setEditingClasses] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newClass, setNewClass] = useState({ class_code: "", class_name: "", semester: "" });
  const [editedClasses, setEditedClasses] = useState<any[]>([]);
  const [editedPreferences, setEditedPreferences] = useState<any>(null);
  const [editedProfile, setEditedProfile] = useState<any>(null);

  // Available classes and majors from database
  const [availableClasses, setAvailableClasses] = useState<Array<{ class_code: string; class_name: string }>>([]);
  const [availableMajors, setAvailableMajors] = useState<Array<{ major_name: string; major_code: string }>>([]);

  useEffect(() => {
    loadProfile();
    fetchAvailableClasses();
    fetchAvailableMajors();
  }, [userId]);

  const fetchAvailableClasses = async () => {
    try {
      const response = await fetch("/api/classes/list?university_id=1000");
      if (!response.ok) {
        console.error("Failed to fetch classes:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        return;
      }
      const data = await response.json();
      console.log("Classes data received:", data);
      if (data.classes && Array.isArray(data.classes)) {
        setAvailableClasses(data.classes);
        console.log("Available classes set:", data.classes.length, "classes");
        // Log a few sample classes to verify they're loaded
        if (data.classes.length > 0) {
          console.log("Sample classes loaded:", data.classes.map((c: any) => c.class_code).slice(0, 3))
        }
      } else {
        console.warn("No classes in response or invalid format:", data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchAvailableMajors = async () => {
    try {
      const response = await fetch("/api/majors/list?university_id=1000");
      const data = await response.json();
      if (data.majors) {
        setAvailableMajors(data.majors);
      }
    } catch (error) {
      console.error("Error fetching majors:", error);
    }
  };

  // Convert available classes to combobox options (memoized)
  const classOptions = useMemo(() => {
    const options = availableClasses.map(cls => {
      const classLabel = `${cls.class_code} - ${cls.class_name}`;
      return {
        value: classLabel,
        label: classLabel
      };
    });
    console.log("Class options computed:", options.length, "options");
    if (options.length > 0) {
      console.log("Sample options:", options.slice(0, 5).map(o => o.label));
    }
    return options;
  }, [availableClasses]);

  const loadProfile = async () => {
    const supabase = createClient();

    const [userRes, profileRes, classesRes, preferencesRes] = await Promise.all([
      supabase.from("users").select("full_name, email, profile_picture_url").eq("user_id", userId).single(),
      supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("student_classes").select("*").eq("user_id", userId),
      supabase.from("study_preferences").select("*").eq("user_id", userId).single()
    ]);

    setUser(userRes.data);
    setProfile(profileRes.data);
    setClasses(classesRes.data || []);
    const prefs = preferencesRes.data
      ? {
          ...preferencesRes.data,
          study_style: normalizeStudyStyles(preferencesRes.data.study_style),
        }
      : null;
    setPreferences(prefs);
    setLoading(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    // Delete old profile picture if exists
    if (user?.profile_picture_url) {
      const oldPath = user.profile_picture_url.split('/profile-pictures/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }
    }

    // Upload new image
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Failed to upload image. Please try again.');
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: publicUrl })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      alert('Failed to update profile. Please try again.');
    } else {
      setUser({ ...user, profile_picture_url: publicUrl });
      window.dispatchEvent(new Event(PROFILE_USER_UPDATED_EVENT));
    }

    setUploading(false);
  };

  // Convert available majors to combobox options (memoized)
  const majorOptions = useMemo(() => {
    const options = availableMajors.map(major => ({
      value: major.major_name,
      label: major.major_name
    }));
    return options;
  }, [availableMajors]);

  const handleEditProfile = () => {
    setEditedProfile({
      major: profile?.major || "",
      year_of_study: profile?.year_of_study || ""
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      const supabase = createClient();
      
      if (!editedProfile.major || !editedProfile.year_of_study) {
        alert("Please fill in all required fields.");
        return;
      }

      const { error } = await supabase
        .from("student_profiles")
        .update({
          major: editedProfile.major,
          year_of_study: editedProfile.year_of_study,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Save profile error:", error);
        alert("Failed to save profile: " + error.message);
        return;
      }

      // Reload profile from database
      await loadProfile();
      setEditingProfile(false);
      setEditedProfile(null);
      alert("Profile updated successfully!");
    } catch (error: any) {
      console.error("Unexpected error saving profile:", error);
      alert("An unexpected error occurred: " + (error.message || "Unknown error"));
    }
  };

  const handleEditClasses = () => {
    // Ensure we have the latest classes before editing
    const supabase = createClient();
    supabase
      .from("student_classes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading classes for edit:", error);
          setEditedClasses([...classes]);
        } else {
          setClasses(data || []);
          setEditedClasses(data || []);
        }
        setEditingClasses(true);
      });
  };

  const handleAddClass = () => {
    console.log("handleAddClass called with newClass:", newClass);
    if (newClass.class_code && newClass.class_name && newClass.semester) {
      const newClassEntry = { ...newClass, id: `temp-${Date.now()}` };
      console.log("Adding class to editedClasses:", newClassEntry);
      setEditedClasses([...editedClasses, newClassEntry]);
      setNewClass({ class_code: "", class_name: "", semester: "" });
      console.log("Updated editedClasses, new length:", editedClasses.length + 1);
    } else {
      console.warn("Cannot add class - missing fields:", {
        hasCode: !!newClass.class_code,
        hasName: !!newClass.class_name,
        hasSemester: !!newClass.semester
      });
      alert("Please fill in all fields: Class code, Class name, and Semester");
    }
  };

  const handleRemoveClass = (id: string) => {
    setEditedClasses(editedClasses.filter(c => c.id !== id));
  };

  const handleSaveClasses = async () => {
    try {
      console.log("Saving classes, editedClasses:", editedClasses);
      const supabase = createClient();
      
      // Delete all existing classes
      const { error: deleteError } = await supabase
        .from("student_classes")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        console.error("Delete error:", deleteError);
        alert("Failed to delete existing classes: " + deleteError.message);
        return;
      }
      
      // Insert new classes (only if there are classes to insert)
      if (editedClasses.length > 0) {
        // Clean the data - only include required fields and exclude id, created_at, etc.
        const classesToInsert = editedClasses.map((cls) => ({
          user_id: userId,
          class_code: cls.class_code?.trim() || "",
          class_name: cls.class_name?.trim() || "",
          semester: cls.semester?.trim() || ""
        })).filter(cls => cls.class_code && cls.class_name && cls.semester);
        
        console.log("Classes to insert:", classesToInsert);
        console.log("User ID:", userId);
        
        if (classesToInsert.length === 0) {
          alert("Please ensure all classes have a code, name, and semester.");
          return;
        }
        
        const { error: insertError, data } = await supabase
          .from("student_classes")
          .insert(classesToInsert)
          .select();
        
        if (insertError) {
          console.error("Insert error:", insertError);
          console.error("Error details:", JSON.stringify(insertError, null, 2));
          console.error("Classes that failed to insert:", classesToInsert);
          alert("Failed to save classes: " + insertError.message + "\n\nCheck the browser console for details.");
          return;
        }
        
        if (!data || data.length === 0) {
          console.error("No data returned from insert");
          alert("Classes save failed - no data returned. Please try again.");
          return;
        }
        
        console.log("Classes inserted successfully:", data);
        console.log("Number of classes inserted:", data.length);
      } else {
        console.log("No classes to insert - editedClasses is empty");
        // If user is trying to save with no classes, that's fine (clearing all classes)
      }
      
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload classes from database to ensure we have the latest data
      const { data: updatedClasses, error: selectError } = await supabase
        .from("student_classes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (selectError) {
        console.error("Select error:", selectError);
        console.error("Select error details:", JSON.stringify(selectError, null, 2));
        alert("Classes saved but failed to reload. Please refresh the page.");
        setEditingClasses(false);
        return;
      }
      
      console.log("Reloaded classes from database:", updatedClasses);
      console.log("Number of classes reloaded:", updatedClasses?.length || 0);
      
      // Update state with reloaded classes
      setClasses(updatedClasses || []);
      
      // Sync with study_preferences: if using specific class matching, set selected_class_code to the first class
      if (updatedClasses && updatedClasses.length > 0) {
        const { data: currentPreferences } = await supabase
          .from("study_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();
        
        if (currentPreferences) {
          // If using specific class matching and selected_class_code is empty or doesn't match any class, set it to the first class
          const needsUpdate = currentPreferences.class_matching_preference === "specific" && 
            (!currentPreferences.selected_class_code || 
             !updatedClasses.some(cls => cls.class_code?.trim() === currentPreferences.selected_class_code?.trim()));
          
          if (needsUpdate) {
            const firstClassCode = updatedClasses[0].class_code?.trim();
            if (firstClassCode) {
              const { error: updatePrefsError } = await supabase
                .from("study_preferences")
                .update({ 
                  selected_class_code: firstClassCode,
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", userId);
              
              if (updatePrefsError) {
                console.error("Error updating preferences with class:", updatePrefsError);
              } else {
                console.log("Synced selected_class_code to first class:", firstClassCode);
              }
            }
          }
        }
      }
      
      // Reload preferences to ensure they have the latest data
      const { data: updatedPreferences } = await supabase
        .from("study_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (updatedPreferences) {
        setPreferences(updatedPreferences);
      }
      
      // Close dialog and reset state
      setEditingClasses(false);
      setNewClass({ class_code: "", class_name: "", semester: "" });
      setEditedClasses([]); // Clear edited classes
      
      // Force a full profile reload to ensure everything is up to date
      try {
        await loadProfile();
        console.log("Profile reloaded successfully");
      } catch (loadError) {
        console.error("Error reloading profile:", loadError);
      }
      
      // Show success message after everything is done
      alert("Classes saved successfully!");
    } catch (error: any) {
      console.error("Unexpected error saving classes:", error);
      alert("An unexpected error occurred: " + (error.message || "Unknown error"));
    }
  };

  const handleEditPreferences = () => {
    // Reload preferences to ensure we have the latest data including updated classes
    const supabase = createClient();
    supabase
      .from("study_preferences")
      .select("*")
      .eq("user_id", userId)
      .single()
      .then(({ data, error }) => {
        const prefs = error ? preferences : data;
        const normalized = prefs
          ? {
              ...prefs,
              study_style: normalizeStudyStyles(prefs.study_style),
            }
          : prefs;
        if (!error && data) {
          setPreferences(normalized);
        }
        setEditedPreferences(normalized ? { ...normalized } : { ...preferences });
        setEditingPreferences(true);
      });
  };

  const togglePreferenceArray = (field: string, value: string) => {
    const current = editedPreferences[field] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setEditedPreferences({ ...editedPreferences, [field]: updated });
  };

  const handleSavePreferences = async () => {
    try {
      const supabase = createClient();
      
      // Validate: if specific class matching is selected, ensure a class is selected
      if (editedPreferences.class_matching_preference === "specific" && !editedPreferences.selected_class_code) {
        alert("Please select a class for specific class matching.");
        return;
      }
      
      // If specific class matching is selected, ensure the selected class is in the user's classes
      if (editedPreferences.class_matching_preference === "specific" && editedPreferences.selected_class_code) {
        const selectedClassCode = editedPreferences.selected_class_code.trim();
        
        // Check if the selected class is already in the user's classes
        const classExists = classes.some(cls => cls.class_code?.trim() === selectedClassCode);
        
        if (!classExists) {
          // Find the class name from availableClasses
          const classInfo = availableClasses.find(c => c.class_code?.trim() === selectedClassCode);
          
          if (classInfo) {
            // Determine semester - use the most recent semester from existing classes, or default to "Current"
            const mostRecentSemester = classes.length > 0 
              ? classes[classes.length - 1].semester || "Current"
              : "Current";
            
            // Add the class to the user's classes
            const { error: insertClassError } = await supabase
              .from("student_classes")
              .insert({
                user_id: userId,
                class_code: classInfo.class_code,
                class_name: classInfo.class_name,
                semester: mostRecentSemester
              });
            
            if (insertClassError) {
              console.error("Error adding class to user's classes:", insertClassError);
              // Continue anyway - we'll try to save preferences even if adding the class fails
            } else {
              console.log("Added selected class to user's classes:", classInfo.class_code);
              // Reload classes to update the state
              const { data: updatedClasses } = await supabase
                .from("student_classes")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
              
              if (updatedClasses) {
                setClasses(updatedClasses);
              }
            }
          }
        }
      }
      
      // Prepare update data
      const updateData: any = {
        study_time_preference: editedPreferences.study_time_preference || [],
        study_location_preference: editedPreferences.study_location_preference || [],
        group_size_preference: editedPreferences.group_size_preference || null,
        study_style: normalizeStudyStyles(editedPreferences.study_style),
        class_matching_preference: editedPreferences.class_matching_preference || "specific",
        updated_at: new Date().toISOString()
      };
      
      // Only include selected_class_code if specific matching is selected
      if (editedPreferences.class_matching_preference === "specific") {
        updateData.selected_class_code = editedPreferences.selected_class_code || null;
      } else {
        // Clear selected_class_code for generic matching
        updateData.selected_class_code = null;
      }
      
      const { error, data } = await supabase
        .from("study_preferences")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();
      
      if (error) {
        console.error("Save preferences error:", error);
        alert("Failed to save preferences: " + error.message);
        return;
      }
      
      // Reload preferences from database
      const { data: updatedPreferences, error: selectError } = await supabase
        .from("study_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (selectError) {
        console.error("Select preferences error:", selectError);
        alert("Preferences saved but failed to reload. Please refresh the page.");
      } else {
        setPreferences(updatedPreferences);
      }
      
      setEditingPreferences(false);
    } catch (error: any) {
      console.error("Unexpected error saving preferences:", error);
      alert("An unexpected error occurred: " + (error.message || "Unknown error"));
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {user?.profile_picture_url && (
                  <AvatarImage src={user.profile_picture_url} alt={user?.full_name} />
                )}
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {user?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Upload className="h-3 w-3 animate-pulse" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl">{user?.full_name || "User"}</CardTitle>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600" />
              Academic Profile
            </CardTitle>
            <CardDescription>Your academic information and background</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleEditProfile}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">University</p>
              <p className="font-semibold text-lg">{profile?.university}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Major</p>
              <p className="font-semibold text-lg">{profile?.major}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Year of Study</p>
              <p className="font-semibold capitalize">{profile?.year_of_study}</p>
            </div>
            {profile?.gpa && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">GPA</p>
                <p className="font-semibold">{profile.gpa}</p>
              </div>
            )}
          </div>
          {profile?.bio && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Bio</p>
              <p className="text-foreground">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Academic Profile Dialog */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Academic Profile</DialogTitle>
            <DialogDescription>
              Update your major and year of study information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div>
              <Label htmlFor="major" className="text-base mb-3 block">Major</Label>
              {availableMajors.length > 0 ? (
                <Combobox
                  options={majorOptions}
                  value={editedProfile?.major || ""}
                  onValueChange={(value) => setEditedProfile({ ...editedProfile, major: value })}
                  placeholder="Select your major..."
                  searchPlaceholder="Search by major name..."
                  emptyMessage="No major found."
                />
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">Loading majors... Please wait.</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="year_of_study" className="text-base mb-3 block">Year of Study</Label>
              <Select
                value={editedProfile?.year_of_study || ""}
                onValueChange={(value) => setEditedProfile({ ...editedProfile, year_of_study: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year of study" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freshman">Freshman</SelectItem>
                  <SelectItem value="Sophomore">Sophomore</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveProfile} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setEditingProfile(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Classes
            </CardTitle>
          </div>
          <Dialog open={editingClasses} onOpenChange={setEditingClasses}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleEditClasses}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Classes</DialogTitle>
                <DialogDescription>
                  Add or remove multiple classes. You can add as many classes as needed before saving.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {editedClasses.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      Your Classes ({editedClasses.length})
                    </Label>
                    {editedClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{cls.class_code} - {cls.class_name}</div>
                          <div className="text-sm text-muted-foreground">{cls.semester}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClass(cls.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`${editedClasses.length > 0 ? 'border-t pt-4' : ''}`}>
                  <Label className="text-base mb-3 block">Add New Class</Label>
                  <div className="space-y-3">
                    <div>
                      <Label>Class</Label>
                      <Combobox
                        options={classOptions}
                        value={newClass.class_code && newClass.class_name ? `${newClass.class_code} - ${newClass.class_name}` : ""}
                        onValueChange={(value) => {
                          if (value) {
                            const match = value.match(/^(.+?)\s*-\s*(.+)$/);
                            if (match) {
                              setNewClass({
                                ...newClass,
                                class_code: match[1].trim(),
                                class_name: match[2].trim()
                              });
                            }
                          } else {
                            setNewClass({ ...newClass, class_code: "", class_name: "" });
                          }
                        }}
                        placeholder="Search and select class..."
                        searchPlaceholder="Search by code or name..."
                        emptyMessage="No class found."
                      />
                    </div>
                    <div>
                      <Label htmlFor="semester">Semester</Label>
                      <Input
                        id="semester"
                        placeholder="Fall 2024"
                        value={newClass.semester}
                        onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddClass} 
                    className="mt-3 w-full" 
                    variant="outline"
                    disabled={!newClass.class_code || !newClass.class_name || !newClass.semester}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                  {editedClasses.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      You can add more classes before saving
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveClasses} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditingClasses(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {cls.class_code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{cls.semester}</span>
                  </div>
                  <p className="font-medium text-foreground">{cls.class_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No classes added yet</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Study Preferences
            </CardTitle>
          </div>
          <Dialog open={editingPreferences} onOpenChange={setEditingPreferences}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleEditPreferences}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Study Preferences</DialogTitle>
                <DialogDescription>
                  Update your preferences to find better study matches.
                </DialogDescription>
              </DialogHeader>
              {editedPreferences && (
                <div className="space-y-6 py-4">
                  <div>
                    <Label className="text-base mb-3 block">Study Times</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Morning", "Afternoon", "Evening", "Night"].map((time) => (
                        <div key={time} className="flex items-center space-x-2">
                          <Checkbox
                            id={`time-${time}`}
                            checked={editedPreferences.study_time_preference?.includes(time)}
                            onCheckedChange={() => togglePreferenceArray("study_time_preference", time)}
                          />
                          <label htmlFor={`time-${time}`} className="text-sm cursor-pointer">
                            {time}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base mb-3 block">Study Locations</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Library", "Coffee Shop", "Dorm", "Online"].map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location}`}
                            checked={editedPreferences.study_location_preference?.includes(location)}
                            onCheckedChange={() => togglePreferenceArray("study_location_preference", location)}
                          />
                          <label htmlFor={`location-${location}`} className="text-sm cursor-pointer">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base mb-3 block">Study Style</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {STUDY_STYLE_OPTIONS.map((style) => (
                        <div key={style} className="flex items-center space-x-2">
                          <Checkbox
                            id={`style-${style}`}
                            checked={editedPreferences.study_style?.includes(style)}
                            onCheckedChange={() => togglePreferenceArray("study_style", style)}
                          />
                          <label htmlFor={`style-${style}`} className="text-sm cursor-pointer">
                            {style}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base mb-3 block">Group Size Preference</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["One-on-one", "Small group (3-5)", "Large group (6+)"].map((size) => (
                        <div key={size} className="flex items-center space-x-2">
                          <Checkbox
                            id={`size-${size}`}
                            checked={editedPreferences.group_size_preference === size}
                            onCheckedChange={() => setEditedPreferences({ ...editedPreferences, group_size_preference: size })}
                          />
                          <label htmlFor={`size-${size}`} className="text-sm cursor-pointer">
                            {size}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base mb-3 block">Class Matching Preference</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose how you want to be matched with other students based on classes
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          editedPreferences.class_matching_preference === "specific"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => setEditedPreferences({ ...editedPreferences, class_matching_preference: "specific" })}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="radio"
                            id="edit-specific"
                            name="editClassMatching"
                            value="specific"
                            checked={editedPreferences.class_matching_preference === "specific"}
                            onChange={() => setEditedPreferences({ ...editedPreferences, class_matching_preference: "specific" })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="edit-specific" className="font-semibold cursor-pointer">
                            Specific Class
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Match me with students taking the exact same classes
                        </p>
                      </div>
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          editedPreferences.class_matching_preference === "generic"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => setEditedPreferences({ ...editedPreferences, class_matching_preference: "generic", selected_class_code: null })}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="radio"
                            id="edit-generic"
                            name="editClassMatching"
                            value="generic"
                            checked={editedPreferences.class_matching_preference === "generic"}
                            onChange={() => setEditedPreferences({ ...editedPreferences, class_matching_preference: "generic", selected_class_code: null })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="edit-generic" className="font-semibold cursor-pointer">
                            Generic Class
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Match me with students in similar subjects/majors
                        </p>
                      </div>
                    </div>
                    
                    {/* Show class selection dropdown when specific matching is selected */}
                    {editedPreferences.class_matching_preference === "specific" && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-base mb-3 block">Select Class for Matching</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Choose which class you want to use for matching with other students
                        </p>
                        {availableClasses.length > 0 ? (
                          <Combobox
                            options={classOptions}
                            value={editedPreferences.selected_class_code 
                              ? availableClasses.find(c => c.class_code === editedPreferences.selected_class_code)
                                ? `${editedPreferences.selected_class_code} - ${availableClasses.find(c => c.class_code === editedPreferences.selected_class_code)?.class_name || ''}`
                                : editedPreferences.selected_class_code
                              : ""}
                            onValueChange={(value) => {
                              // The value from classOptions is in format "CODE - Name"
                              // Extract just the class code for storage
                              const match = value.match(/^(.+?)\s*-\s*/);
                              const classCode = match ? match[1].trim() : value;
                              setEditedPreferences({ ...editedPreferences, selected_class_code: classCode });
                            }}
                            placeholder="Select a class..."
                            searchPlaceholder="Search by code or name..."
                            emptyMessage="No class found."
                          />
                        ) : (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              Loading classes... Please wait.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSavePreferences} className="flex-1">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPreferences(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Preferred Study Times</p>
            <div className="flex flex-wrap gap-2">
              {preferences?.study_time_preference?.map((time: string) => (
                <Badge key={time} variant="outline" className="bg-green-50 border-green-200">
                  {time}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Preferred Locations</p>
            <div className="flex flex-wrap gap-2">
              {preferences?.study_location_preference?.map((location: string) => (
                <Badge key={location} variant="outline" className="bg-purple-50 border-purple-200">
                  <MapPin className="h-3 w-3 mr-1" />
                  {location}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Group Size Preference</p>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {preferences?.group_size_preference}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Study Style</p>
            <div className="flex flex-wrap gap-2">
              {preferences?.study_style?.map((style: string) => (
                <Badge key={style} variant="outline" className="bg-orange-50 border-orange-200">
                  {style}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Class Matching Preference</p>
            <Badge className={`${
              preferences?.class_matching_preference === "generic"
                ? "bg-purple-100 text-purple-800 border-purple-200"
                : "bg-indigo-100 text-indigo-800 border-indigo-200"
            }`}>
              {preferences?.class_matching_preference === "generic" 
                ? "Generic Class Matching" 
                : "Specific Class Matching"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {preferences?.class_matching_preference === "generic"
                ? "Matching by similar subjects/majors"
                : preferences?.selected_class_code 
                  ? `Matching by class: ${preferences.selected_class_code}`
                  : "Matching by exact same classes"}
            </p>
            {preferences?.class_matching_preference === "specific" && preferences?.selected_class_code && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {availableClasses.find(c => c.class_code === preferences.selected_class_code)?.class_name || preferences.selected_class_code}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
