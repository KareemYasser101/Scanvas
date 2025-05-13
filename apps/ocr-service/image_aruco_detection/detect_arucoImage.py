import cv2
import numpy as np
import sys
import matplotlib.pyplot as plt
import os

def process_image(image_path, output_path):
    # --- Step 1: Load the image and enhance contrast ---
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found. Check the path.")

    # --- Contrast enhancement using CLAHE ---
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced_lab = cv2.merge((cl, a, b))
    image = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    original_image = image.copy()

    # --- Step 2: Detect ArUco markers ---
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    parameters = cv2.aruco.DetectorParameters()
    detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
    corners, ids, _ = detector.detectMarkers(image)
    print("corners: ", corners, "ids: ", ids)

    if ids is None or len(ids) < 3:
        raise Exception("Less than 3 ArUco markers detected!")

    print("Detected marker IDs:", ids.flatten())

    # --- Step 3: Visualize detections ---
    image_markers = image.copy()
    cv2.aruco.drawDetectedMarkers(image_markers, corners, ids)

    # --- Step 4: Extract specific marker corners ---
    try:
        id_list = ids.flatten().tolist()
        id_to_corners = {int(id_): corners[i][0] for i, id_ in enumerate(id_list)}

        c1 = id_to_corners[1]  # Marker ID 1 (top-left)
        c2 = id_to_corners[2]  # Marker ID 2 (top-right)
        c3 = id_to_corners[3]  # Marker ID 3 (bottom-left)

        top_left = c1[0]       # Corner 0 of marker 1
        top_right = c2[1]      # Corner 1 of marker 2
        bottom_left = c3[3]    # Corner 3 of marker 3

        vector_right = top_right - top_left
        vector_down = bottom_left - top_left
        bottom_right = top_left + vector_right + vector_down

    except KeyError:
        raise Exception("Could not find all required marker IDs: 1, 2, 3.")

    # --- Step 5: Perspective correction ---
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

    # --- Step 6: Save the output image ---
    cv2.imwrite(output_path, warped)
    print(f"✅ Transformed image saved to: {output_path}")

    output_folder = os.path.dirname(image_path)
    corrected_output = os.path.join(output_folder, "perspective_corrected.png")
    cv2.imwrite(corrected_output, warped)
    print(f"✅ Also saved as: {corrected_output}")

    # --- Step 7: Extract grid cells ---
    def extract_grid_cells(warped_img):
        gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        height, width = binary.shape

        horizontal_kernel_length = max(10, width // 30)
        vertical_kernel_length = max(10, height // 30)

        print(f"Using horizontal kernel length: {horizontal_kernel_length}")
        print(f"Using vertical kernel length: {vertical_kernel_length}")

        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (horizontal_kernel_length, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vertical_kernel_length))

        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

        grid = cv2.add(horizontal_lines, vertical_lines)

        contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        cells = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > width * 0.02 and h > height * 0.02 and w < width * 0.95 and h < height * 0.95:
                cells.append((x, y, w, h))

        cells = sorted(cells, key=lambda b: (b[1], b[0]))

        grid_vis = warped_img.copy()
        for idx, (x, y, w, h) in enumerate(cells):
            cv2.rectangle(grid_vis, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(grid_vis, str(idx + 1), (x + 5, y + 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

        return grid_vis, cells

    grid_image, cell_boxes = extract_grid_cells(warped)
    print(f"✅ Detected {len(cell_boxes)} cells.")

    grid_output = os.path.join(output_folder, "grid_detected.png")
    cv2.imwrite(grid_output, grid_image)
    print(f"✅ Grid with boxes saved as: {grid_output}")

    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(grid_image, cv2.COLOR_BGR2RGB))
    plt.title("Detected Grid Cells")
    plt.axis('off')
    plt.show()

    # --- Step 8: Save each cell as an image ---
    output_cells_folder = os.path.join(output_folder, "extracted_cells")
    os.makedirs(output_cells_folder, exist_ok=True)

    for idx, (x, y, w, h) in enumerate(cell_boxes):
        cell_img = warped[y:y+h, x:x+w]
        cell_filename = os.path.join(output_cells_folder, f"cell_{idx+1:03d}.png")
        cv2.imwrite(cell_filename, cell_img)

    print(f"✅ Saved {len(cell_boxes)} cell images to: {output_cells_folder}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python detect_and_warp.py input_image output_image")
        sys.exit(1)

    input_image = sys.argv[1]
    output_image = sys.argv[2]

    process_image(input_image, output_image)
