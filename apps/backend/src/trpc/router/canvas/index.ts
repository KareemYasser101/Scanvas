import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { CanvasApi } from "@kth/canvas-api";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import FormData from "form-data";
import { Buffer } from "buffer";

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

export async function getExtractedIdsFromOCR(
  base64ImageUrls: string[]
): Promise<string[]> {
  try {
    const FLASK_OCR_URL = process.env.OCR_SERVICE_LINK_PROD ?  `${process.env.OCR_SERVICE_LINK_PROD}/extractIds` : `${process.env.OCR_SERVICE_LINK_DEV}/extractIds`;
    const formData = new FormData();

    base64ImageUrls.forEach((base64, i) => {
      // Extract base64 string (remove data:image/jpeg;base64,...)
      const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
      if (!matches || matches.length !== 2) {
        throw new Error("Invalid base64 image format");
      }

      const buffer = Buffer.from(matches[1], "base64");
      formData.append("images", buffer, {
        filename: `image_${i + 1}.jpg`,
        contentType: "image/jpeg",
      });
    });

    const response = await axios.post(FLASK_OCR_URL, formData, {
      headers: formData.getHeaders(),
    });

    if (response.data.status !== "success") {
      throw new Error(response.data.message || "OCR failed");
    }

    const idArray = Array.isArray(response.data.idArray)
      ? response.data.idArray.filter(
          (id): id is string => typeof id === "string"
        )
      : [];

    return [...new Set(idArray)] as string[];
  } catch (error: any) {
    console.error("Error calling OCR service:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.response?.data?.message || "OCR image processing failed",
    });
  }
}

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

      // ✅ Step 3: Fetch enrolled students
      const response = await canvas.get(
        `/api/v1/courses/${input.courseId}/users?enrollment_type[]=student`
      );

      const enrolledStudents = response.json as Array<any>;

      // ✅ Step 4: Build mapping and gradeData
      const universityIdToStudentMap: Record<
        string,
        { studentId: string; studentName: string }
      > = {};

      const allStudentIds = enrolledStudents.map((student) => student.id);
      const gradeData = allStudentIds.reduce(
        (acc, studentId) => {
          acc[studentId] = { posted_grade: 0 };
          return acc;
        },
        {} as Record<string, { posted_grade: number }>
      );

      for (const student of enrolledStudents) {
        const email = student.email || student.login_id;
        const uniId = email?.split("@")[0];
        if (uniId) {
          universityIdToStudentMap[uniId] = {
            studentId: student.id,
            studentName: student.name,
          };
        }
      }

      // ✅ Step 5: OCR extracted IDs
      const ocrExtractedIds = await getExtractedIdsFromOCR(input.imageUrls);

      const presentCanvasUserIds = ocrExtractedIds
        .map((uniId) => universityIdToStudentMap[uniId]?.studentId)
        .filter((id): id is string => Boolean(id));

      if (presentCanvasUserIds.length === 0) {
        return {
          success: false,
          message: "No student IDs extracted",
          assignmentId,
          markedStudents: 0,
        };
      }

      // ✅ Step 6: Update gradeData
      presentCanvasUserIds.forEach((canvasUserId) => {
        gradeData[canvasUserId] = { posted_grade: input.pointsPossible };
      });

      // ✅ Step 7: Submit grades
      await canvas.request(
        `/api/v1/courses/${input.courseId}/assignments/${assignmentId}/submissions/update_grades`,
        "POST",
        { grade_data: gradeData }
      );

      // ✅ Step 8: Extract present student details
      const presentStudentDetails = ocrExtractedIds
        .map((uniId) => {
          const student = universityIdToStudentMap[uniId];
          return student
            ? { id: uniId, name: student.studentName }
            : null;
        })
        .filter(
          (student): student is { id: string; name: string } => student !== null
        );

      return {
        success: true,
        message: "✅ Attendance marked for matching students",
        assignmentId,
        markedStudents: presentCanvasUserIds.length,
        presentStudents: presentStudentDetails,
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
