import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { CanvasApi } from "@kth/canvas-api";
import { TRPCError } from "@trpc/server";

const API_URL = "https://canvas.instructure.com";
const KAREEM_ACCESS_TOKEN =
  "7~WE9fPFCX8Nv9ZVt3x8BwCVMEYKkY3e4JQPhz2VxKQNfGCxUKDycrFyRWRuzKQVr6";

type CanvasUser = {
  id: number;
  name: string;
  login_id: string;
  primary_email?: string;
};

type Course = {
  id: number;
  name: string;
  course_code: string;
  start_at?: string;
  end_at?: string;
};

export const canvasRouter = router({
  //#region auth
  authenticateAccessToken: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1, "Access token is required"),
      })
    )
    .mutation(async ({ input }) => {
      const canvas = new CanvasApi(API_URL, input.accessToken);
      console.log("Canvas: ", canvas);
      try {
        // First get the user's profile
        const userResponse = await canvas.get("/api/v1/users/self");
        console.log("User profile: ", userResponse);
        const userData = userResponse.body;

        // If we get a redirect, the token is invalid
        if (userResponse.statusCode === 302) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid access token",
          });
        }

        // Get user's courses to verify the token has the right permissions
        const coursesResponse = await canvas.get("/api/v1/courses");
        if (coursesResponse.statusCode === 302) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token doesn't have courses access",
          });
        }

        // Return the user's information
        return {
          success: true,
          user: {
            id: userData.id,
            name: userData.name,
            avatarUrl: userData.avatar_url,
            locale: userData.locale,
            createdAt: userData.created_at,
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected authentication error",
        });
      }
    }),
  //#endregion auth

  //#region getCourses
  getCourses: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
      })
    )
    .query(async ({ input }) => {
      const canvas = new CanvasApi(API_URL, input.accessToken);

      try {
        // Fetch courses for the authenticated user
        const coursesResponse = await canvas.get("/api/v1/courses");
        console.log("courses: ", coursesResponse);
        // Check if response is valid
        if (!Array.isArray(coursesResponse.json)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid courses response",
          });
        }

        // Map and return courses with selected properties
        const courses: Course[] = coursesResponse.json.map(
          (course: Course) => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code,
            start_at: course.start_at,
            end_at: course.end_at,
          })
        );

        return {
          success: true,
          courses,
          total: courses.length,
        };
      } catch (error) {
        console.error("Courses fetch error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to fetch courses",
        });
      }
    }),
  //#endregion getCourses

  //#region create
  create_Mark_AttendanceAssignment: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1, "Access Token is required"),
        courseId: z.string().min(1, "Course ID is required"),
        imageUrls: z
          .array(z.string().url("Each image URL must be valid"))
          .min(1, "At least one image URL is required"),
        assignmentName: z.string().min(1, "Assignment Name is required"),
        pointsPossible: z.number().min(0.5, "Points must be greater than 0"),
      })
    )
    .mutation(async ({ input }) => {
      const canvas = new CanvasApi(API_URL, input.accessToken);

      try {
        // ✅ Step 1: Validate access token
        const checkAuth = await canvas.get("/api/v1/users/self");
        if (checkAuth.statusCode === 302 || !checkAuth.json) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid access token",
          });
        }

        // ✅ Step 2: Create the assignment
        const assignmentResponse = await canvas.request(
          `/api/v1/courses/${input.courseId}/assignments`,
          "POST",
          {
            assignment: {
              name: input.assignmentName,
              points_possible: input.pointsPossible,
              submission_types: ["none"],
              published: true,
              description: `Attendance based on SCanvas image upload`,
            },
          }
        );

        const assignmentId = assignmentResponse.json?.id;
        if (!assignmentId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create attendance assignment",
          });
        }

        // Step 3: Fetch all enrolled users
        const response = await canvas.get(
          `/api/v1/courses/${input.courseId}/users?enrollment_type[]=student`
        );

        const enrolledStudents = response.json as Array<any>;

        // Step 4: Build universityId → canvasUserId map
        const universityIdToCanvasIdMap: Record<string, number> = {};
        for (const student of enrolledStudents) {
          const email = student.email || student.login_id;
          const uniId = email?.split("@")[0];
          if (uniId) {
            universityIdToCanvasIdMap[uniId] = student.id;
          }
        }

        // ✅ Step 5: Extract IDs from OCR (mocked for now)
        const ocrExtractedIds = ["22-101100", "22-101184"]; // Replace with OCR service result

        const presentStudents = ocrExtractedIds
          .map((uniId) => universityIdToCanvasIdMap[uniId])
          .filter(Boolean); // Remove undefined if not found

        if (presentStudents.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No matching students found from OCR IDs",
          });
        }

        // ✅ Step 6: Prepare grade payload
        const gradeData = presentStudents.reduce(
          (acc, canvasUserId) => {
            acc[canvasUserId] = { posted_grade: input.pointsPossible };
            return acc;
          },
          {} as Record<string, { posted_grade: number }>
        );

        // ✅ Step 7: Submit grades in bulk
        await canvas.request(
          `/api/v1/courses/${input.courseId}/assignments/${assignmentId}/submissions/update_grades`,
          "POST",
          { grade_data: gradeData }
        );

        return {
          success: true,
          message: "✅ Attendance marked for matching students",
          assignmentId,
          markedStudents: presentStudents.length,
        };
      } catch (error) {
        console.error("Attendance Error:", error);
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected error during attendance",
        });
      }
    }),

  //#endregion create
});
