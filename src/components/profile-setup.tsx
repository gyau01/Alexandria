"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { STUDY_STYLE_OPTIONS } from "@/lib/studyPreferenceOptions";
import { Plus, X } from "lucide-react";

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Academic Info State
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [gpa, setGpa] = useState("");
  const [bio, setBio] = useState("");

  // Classes State - store full class value to avoid reconstruction issues
  const [classes, setClasses] = useState<Array<{ code: string; name: string; semester: string; fullValue?: string }>>([
    { code: "", name: "", semester: "" }
  ]);

  // Study Preferences State
  const [studyTimes, setStudyTimes] = useState<string[]>([]);
  const [studyLocations, setStudyLocations] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState("");
  const [studyStyles, setStudyStyles] = useState<string[]>([]);
  const [classMatchingPreference, setClassMatchingPreference] = useState<string>("specific");
  const [selectedClassCode, setSelectedClassCode] = useState<string>("");

  // Available classes from database
  const [availableClasses, setAvailableClasses] = useState<Array<{ class_code: string; class_name: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Available majors from database
  const [availableMajors, setAvailableMajors] = useState<Array<{ major_name: string; major_code: string }>>([]);
  const [loadingMajors, setLoadingMajors] = useState(false);

  // Fetch classes from database
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const response = await fetch("/api/classes/list?university_id=1000");
        const data = await response.json();
        if (data.classes) {
          setAvailableClasses(data.classes);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch majors from database
  useEffect(() => {
    const fetchMajors = async () => {
      setLoadingMajors(true);
      try {
        const response = await fetch("/api/majors/list");
        if (!response.ok) {
          console.error("Failed to fetch majors:", response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          console.error("Error details:", errorData);
          return;
        }
        const data = await response.json();
        console.log("Majors data received:", data);
        if (data.majors && Array.isArray(data.majors)) {
          setAvailableMajors(data.majors);
          console.log("Available majors set:", data.majors.length, "majors");
        } else {
          console.warn("No majors in response or invalid format:", data);
        }
      } catch (error) {
        console.error("Error fetching majors:", error);
      } finally {
        setLoadingMajors(false);
      }
    };
    fetchMajors();
  }, []);

  // University options (only University of Louisville for now)
  const universityOptions = [
    { value: "University of Louisville", label: "University of Louisville" }
  ];

  // Convert available majors to combobox options
  const majorOptions = useMemo(() => {
    return availableMajors.map(m => ({
      value: m.major_name,
      label: m.major_name
    }));
  }, [availableMajors]);

  // Convert available classes to combobox options (memoized for performance)
  // Use the same format as university/major - label and value should match for consistency
  const classOptions = useMemo(() => {
    return availableClasses.map(cls => {
      const classLabel = `${cls.class_code} - ${cls.class_name}`;
      return {
        value: classLabel,  // Use label as value, same as university/major
        label: classLabel
      };
    });
  }, [availableClasses]);

  const addClass = () => {
    setClasses([...classes, { code: "", name: "", semester: "", fullValue: "" }]);
  };

  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  const updateClass = (index: number, field: string, value: string) => {
    const updated = [...classes];
    updated[index] = { ...updated[index], [field]: value };
    setClasses(updated);
  };

  // Helper function to construct class value in the same format as options
  const constructClassValue = (code: string, name: string): string => {
    if (!code || !name) return "";
    // Ensure exact format match: "CODE - Name" with single spaces
    const constructed = `${code.trim()} - ${name.trim()}`;
    console.log('constructClassValue:', { code, name, constructed });
    return constructed;
  };

  // Helper function to parse class code from the selected value
  const parseClassCode = (classValue: string): string => {
    if (!classValue) return "";
    const match = classValue.match(/^(.+?)\s*-\s*/);
    return match ? match[1].trim() : "";
  };

  // Helper function to parse class name from the selected value
  const parseClassName = (classValue: string): string => {
    if (!classValue) return "";
    const match = classValue.match(/^.+?\s*-\s*(.+)$/);
    return match ? match[1].trim() : "";
  };

  // Handler for class selection - extracts code and name from the selected value
  const handleClassSelection = (index: number, selectedValue: string) => {
    if (selectedValue) {
      const code = parseClassCode(selectedValue);
      const name = parseClassName(selectedValue);
      const updated = [...classes];
      updated[index] = { 
        ...updated[index], 
        code, 
        name,
        fullValue: selectedValue // Store the full value to ensure exact match
      };
      setClasses(updated);
    } else {
      updateClass(index, "code", "");
      updateClass(index, "name", "");
      const updated = [...classes];
      updated[index] = { ...updated[index], fullValue: "" };
      setClasses(updated);
    }
  };

  const togglePreference = (value: string, state: string[], setState: (val: string[]) => void) => {
    if (state.includes(value)) {
      setState(state.filter(item => item !== value));
    } else {
      setState([...state, value]);
    }
  };

  const handleSubmit = async () => {
    // Validate: if specific class matching is selected, ensure a class is selected
    if (classMatchingPreference === "specific" && !selectedClassCode) {
      const validClasses = classes.filter(c => c.code && c.name);
      if (validClasses.length === 0) {
        alert("Please add at least one class before selecting specific class matching.");
        return;
      }
      alert("Please select a class for specific class matching.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { university, major, yearOfStudy, gpa: parseFloat(gpa), bio },
          classes: classes.filter(c => c.code && c.name),
          preferences: { 
            studyTimes, 
            studyLocations, 
            groupSize, 
            studyStyles, 
            classMatchingPreference,
            selectedClassCode: classMatchingPreference === "specific" ? selectedClassCode : null
          }
        })
      });

      if (response.ok) {
        router.push("/dashboard/finding-matches");
      } else {
        const errorData = await response.json();
        alert("Failed to save profile: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Help us find your perfect study buddy</p>
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-24 rounded-full transition-colors ${
                  s <= step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
              <CardDescription>Tell us about your academic background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="university">University</Label>
                <Combobox
                  options={universityOptions}
                  value={university}
                  onValueChange={setUniversity}
                  placeholder="Select university..."
                  searchPlaceholder="Search university..."
                  emptyMessage="No university found."
                />
              </div>
              <div>
                <Label htmlFor="major">Major</Label>
                <Combobox
                  options={majorOptions}
                  value={major}
                  onValueChange={setMajor}
                  placeholder="Select major..."
                  searchPlaceholder="Search major..."
                  emptyMessage="No major found."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year of Study</Label>
                  <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshman">Freshman</SelectItem>
                      <SelectItem value="sophomore">Sophomore</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gpa">GPA (Optional)</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    placeholder="3.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself and your study goals..."
                  rows={4}
                />
              </div>
              <Button onClick={() => setStep(2)} className="w-full" disabled={!university || !major || !yearOfStudy}>
                Next
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Current Classes</CardTitle>
              <CardDescription>Add the classes you're currently taking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {classes.map((cls, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label>Class</Label>
                      <Combobox
                        options={classOptions}
                        value={cls.fullValue || constructClassValue(cls.code, cls.name)}
                        onValueChange={(value) => handleClassSelection(index, value)}
                        placeholder="Search and select class..."
                        searchPlaceholder="Search by code or name..."
                        emptyMessage="No class found."
                      />
                    </div>
                    <div>
                      <Label>Semester</Label>
                      <Input
                        value={cls.semester}
                        onChange={(e) => updateClass(index, "semester", e.target.value)}
                        placeholder="Fall 2024"
                      />
                    </div>
                  </div>
                  {classes.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeClass(index)}
                      className="mb-0.5"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addClass} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Class
              </Button>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Study Preferences</CardTitle>
              <CardDescription>Help us match you with compatible study partners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base mb-3 block">Preferred Study Times</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Morning", "Afternoon", "Evening", "Late Night"].map((time) => (
                    <div key={time} className="flex items-center space-x-2">
                      <Checkbox
                        id={time}
                        checked={studyTimes.includes(time)}
                        onCheckedChange={() => togglePreference(time, studyTimes, setStudyTimes)}
                      />
                      <label htmlFor={time} className="text-sm cursor-pointer">
                        {time}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base mb-3 block">Preferred Study Locations</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Library", "Coffee Shop", "Dorm", "Online"].map((location) => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={location}
                        checked={studyLocations.includes(location)}
                        onCheckedChange={() => togglePreference(location, studyLocations, setStudyLocations)}
                      />
                      <label htmlFor={location} className="text-sm cursor-pointer">
                        {location}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="groupSize">Preferred Group Size</Label>
                <Select value={groupSize} onValueChange={setGroupSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-on-one">One-on-One</SelectItem>
                    <SelectItem value="small">Small Group (3-4)</SelectItem>
                    <SelectItem value="large">Large Group (5+)</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base mb-3 block">Study Style</Label>
                <div className="grid grid-cols-2 gap-3">
                  {STUDY_STYLE_OPTIONS.map((style) => (
                    <div key={style} className="flex items-center space-x-2">
                      <Checkbox
                        id={style}
                        checked={studyStyles.includes(style)}
                        onCheckedChange={() => togglePreference(style, studyStyles, setStudyStyles)}
                      />
                      <label htmlFor={style} className="text-sm cursor-pointer">
                        {style}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base mb-3 block">Class Matching Preference</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Choose how you want to be matched with other students based on classes
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      classMatchingPreference === "specific"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setClassMatchingPreference("specific")}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        id="specific"
                        name="classMatching"
                        value="specific"
                        checked={classMatchingPreference === "specific"}
                        onChange={() => setClassMatchingPreference("specific")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="specific" className="font-semibold cursor-pointer">
                        Specific Class
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600">
                      Match me with students taking the exact same classes
                    </p>
                  </div>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      classMatchingPreference === "generic"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setClassMatchingPreference("generic");
                      setSelectedClassCode("");
                    }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        id="generic"
                        name="classMatching"
                        value="generic"
                        checked={classMatchingPreference === "generic"}
                        onChange={() => setClassMatchingPreference("generic")}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="generic" className="font-semibold cursor-pointer">
                        Generic Class
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600">
                      Match me with students in similar subjects/majors
                    </p>
                  </div>
                </div>
                
                {/* Show class selection dropdown when specific matching is selected */}
                {classMatchingPreference === "specific" && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-base mb-3 block">Select Class for Matching</Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Choose which class you want to use for matching with other students
                    </p>
                    {classes.filter(c => c.code && c.name).length > 0 ? (
                      <Combobox
                        options={classes.filter(c => c.code && c.name).map(cls => {
                          const classLabel = `${cls.code} - ${cls.name}${cls.semester ? ` (${cls.semester})` : ""}`;
                          return {
                            value: classLabel,  // Use label as value, same as other fields
                            label: classLabel
                          };
                        })}
                        value={selectedClassCode ? classes.find(c => c.code === selectedClassCode) ? `${classes.find(c => c.code === selectedClassCode)!.code} - ${classes.find(c => c.code === selectedClassCode)!.name}${classes.find(c => c.code === selectedClassCode)!.semester ? ` (${classes.find(c => c.code === selectedClassCode)!.semester})` : ""}` : "" : ""}
                        onValueChange={(value) => {
                          // Use helper function to extract class code
                          const code = parseClassCode(value);
                          setSelectedClassCode(code);
                        }}
                        placeholder="Select a class..."
                        searchPlaceholder="Search by code or name..."
                        emptyMessage="No class found."
                      />
                    ) : (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Please add at least one class in the previous step first.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Complete Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}