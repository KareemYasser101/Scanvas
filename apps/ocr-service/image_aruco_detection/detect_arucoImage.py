import cv2
import numpy as np
import sys
import matplotlib.pyplot as plt

def process_image(image_path, output_path):
    # --- Step 1: Load the image ---
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found. Check the path.")

    # For subplot later
    original_image = image.copy()

    # --- Step 2: Detect ArUco markers ---
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    parameters = cv2.aruco.DetectorParameters()

    detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

    corners, ids, _ = detector.detectMarkers(image)

    if ids is None or len(ids) < 3:
        raise Exception("Less than 3 ArUco markers detected!")

    print("Detected marker IDs:", ids.flatten())

    # --- Step 3: Visualize detections ---
    image_markers = image.copy()
    cv2.aruco.drawDetectedMarkers(image_markers, corners, ids)

    # --- Step 4: Map marker IDs to corners ---
    image_centers = image_markers.copy()
    corner_positions = {}

    for i, marker_id in enumerate(ids.flatten()):
        c = corners[i][0]
        cX = int(np.mean(c[:, 0]))
        cY = int(np.mean(c[:, 1]))
        corner_positions[marker_id] = (cX, cY)
        cv2.circle(image_centers, (cX, cY), 10, (0, 255, 0), -1)
        cv2.putText(image_centers, f"ID {marker_id}", (cX - 20, cY - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    # --- Step 5: Compute the fourth corner ---
    try:
        top_left = np.array(corner_positions[1])
        top_right = np.array(corner_positions[2])
        bottom_left = np.array(corner_positions[3])
    except KeyError:
        raise Exception("Could not find all required marker IDs: 1, 2, 3.")

    vector_right = top_right - top_left
    vector_down = bottom_left - top_left
    bottom_right = top_left + vector_right + vector_down

    # --- Step 6: Perspective correction ---
    src_pts = np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")

    widthA = np.linalg.norm(bottom_right - bottom_left)
    widthB = np.linalg.norm(top_right - top_left)
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.linalg.norm(top_right - bottom_right)
    heightB = np.linalg.norm(top_left - bottom_left)
    maxHeight = max(int(heightA), int(heightB))

    dst_pts = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))

    # --- Step 7: Save the output ---
    cv2.imwrite(output_path, warped)
    print(f"✅ Transformed image saved to: {output_path}")

    # --- Step 8: Plot all images in subplots ---
    fig, axs = plt.subplots(2, 2, figsize=(15, 15))

    axs[0, 0].imshow(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB))
    axs[0, 0].set_title("Original Image")
    axs[0, 0].axis('off')

    axs[0, 1].imshow(cv2.cvtColor(image_markers, cv2.COLOR_BGR2RGB))
    axs[0, 1].set_title("Detected Markers")
    axs[0, 1].axis('off')

    axs[1, 0].imshow(cv2.cvtColor(image_centers, cv2.COLOR_BGR2RGB))
    axs[1, 0].set_title("Detected Centers")
    axs[1, 0].axis('off')

    axs[1, 1].imshow(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB))
    axs[1, 1].set_title("Perspective Corrected Sheet")
    axs[1, 1].axis('off')

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python detect_and_warp.py input_image output_image")
        sys.exit(1)

    input_image = sys.argv[1]
    output_image = sys.argv[2]

    process_image(input_image, output_image)
