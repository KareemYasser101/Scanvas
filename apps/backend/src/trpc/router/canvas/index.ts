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
        const userResponse = await canvas.get("/api/v1/courses");
        console.log("user: ", userResponse);
        // ✅ Check if Canvas redirects instead of authenticating
        if (userResponse.statusCode === 302) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid access token ❌",
          });
        }

        // ✅ Otherwise, treat it as a valid user
        const user = userResponse as unknown as CanvasUser;

        return {
          success: true,
          message: "Access token is valid ✅",
          user: {
            id: user.id,
            name: user.name,
            email: user.primary_email || user.login_id,
            loginId: user.login_id,
          },
        };
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
        imageUrl: z.string().url("Image URL must be valid"),
        assignmentName: z.string().min(1, "Assignment Name is required"),
        pointsPossible: z.number().min(0.5, "Points must be greater than 0"),
      })
    )
    .mutation(async ({ input }) => {
      const canvas = new CanvasApi(API_URL, input.accessToken);

      try {
        // ✅ Check if access token is valid
        const checkAuth = await canvas.get("/api/v1/users/self");
        if (checkAuth.statusCode === 302 || !checkAuth.json) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid access token ❌",
          });
        }

        // ✅ Create the attendance assignment
        const assignmentResponse = await canvas.request(
          `/api/v1/courses/${input.courseId}/assignments`,
          "POST",
          {
            name: input.assignmentName,
            points_possible: input.pointsPossible,
            submission_types: ["none"], // No file uploads
            published: true,
            description: `Attendance based on image: ${input.imageUrl}`,
          }
        );

        const assignmentId = assignmentResponse.json?.id;
        if (!assignmentId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create attendance assignment",
          });
        }

        // *******OCR-SERVICE*******
        // ***Send and Recieve requests using HTTP to the python server***

        // ✅ Hardcoded list of students for now (replace later with OCR output)
        const presentStudents = [
          12345, // Example Canvas User IDs
          67890,
        ];
        // *******OCR-SERVICE*******
        
        // After assignment is created
        const gradeData = presentStudents.reduce(
          (acc, studentId) => {
            acc[studentId] = { posted_grade: input.pointsPossible };
            return acc;
          },
          {} as Record<string, { posted_grade: number }>
        );

        // ✅ Bulk mark all students at once
        await canvas.request(
          `/api/v1/courses/${input.courseId}/assignments/${assignmentId}/submissions/update_grades`,
          "POST",
          {
            grade_data: gradeData,
          }
        );

        return {
          success: true,
          message: "Attendance assignment created and students marked ✅",
          assignmentId,
          markedStudents: presentStudents.length,
        };
      } catch (error) {
        console.error("Attendance Error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected server error during attendance process",
        });
      }
    }),
  //#endregion create
});
