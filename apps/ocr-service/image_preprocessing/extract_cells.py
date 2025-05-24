import cv2
import numpy as np
import itertools

def process_image(image):
    """
    Process an image to extract cells and detect markers.
    
    Args:
        image: Input image as a numpy array
        
    Returns:
        tuple: (cleaned_cells, num_markers, error_message)
            - cleaned_cells: List of processed cell images (or None if error)
            - num_markers: Number of detected markers (0 if error)
            - error_message: Error message if any, None if successful
    """
    if image is None:
        return None, 0, "Input image is None"
    
    try:
        # Convert to grayscale if it's a color image
        if len(image.shape) == 3 and image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply custom range thresholding
        processed = np.where(gray <= 100, 0, gray)  # Pixels 0–100 → 0
        processed = processed.astype(np.uint8)

        # Detect ArUco markers
        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        parameters = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
        corners, ids, _ = detector.detectMarkers(processed)

        num_markers = 0 if ids is None else len(ids)
        print(f"Found {num_markers} markers:", ids if ids is not None else "None")
        
        if num_markers < 4:
            return None, num_markers, f"Need 4 corner tags – found {num_markers}"

        # Sort markers by position
        marker_positions = []
        for i, c in enumerate(corners):
            c = c[0]
            center = np.mean(c, axis=0)
            marker_positions.append((center, c))

        marker_positions = sorted(marker_positions, key=lambda x: (x[0][1], x[0][0]))
        top_two = sorted(marker_positions[:2], key=lambda x: x[0][0])
        bottom_two = sorted(marker_positions[2:], key=lambda x: x[0][0])

        top_left     = top_two[0][1][0]
        top_right    = top_two[1][1][1]
        bottom_right = bottom_two[1][1][2]
        bottom_left  = bottom_two[0][1][3]

        # Perspective transform
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
        warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight), flags=cv2.INTER_CUBIC)

        # Preprocessing for contour detection
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        # 1) smooth noise
        blur = cv2.GaussianBlur(gray, (5,5), 0)

        # 2) compute Otsu’s threshold
        ret, _ = cv2.threshold(
            blur,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )

        # 3) back off by Δ so lighter ink stays black
        delta = -40                  # try values 10–30
        th    = max(ret - delta, 0)
        _, processed = cv2.threshold(
            blur,
            th,
            255,
            cv2.THRESH_BINARY
        )
        processed = processed.astype(np.uint8)

        # Extract cells
        grid_image, id_cells = extract_id_cells(processed)
        cleaned_cells = []

        for idx, (x, y, w, h) in enumerate(id_cells):
            margin = 4
            x1 = max(x + margin, 0)
            y1 = max(y + margin, 0)
            x2 = min(x + w - margin, warped.shape[1])
            y2 = min(y + h - margin, warped.shape[0])

            cell_img = warped[y1:y2, x1:x2]
            clean_img = clean_and_rebuild_cell(cell_img)
            cleaned_cells.append(clean_img)

        return cleaned_cells, num_markers, None

    except Exception as e:
        import traceback
        error_msg = f"Error processing image: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return None, num_markers, error_msg

def extract_id_cells(warped_img):
    # Safely convert to grayscale
    if len(warped_img.shape) == 3:
        gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = warped_img.copy()

    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    height, width = binary.shape
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (width // 30, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, height // 30))

    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

    grid = cv2.add(horizontal_lines, vertical_lines)
    contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h)
        if (
            w > width * 0.02 and h > height * 0.02 and
            w < width * 0.95 and h < height * 0.95 and
            0.5 < aspect_ratio < 2.0  # Filter out overly rectangular boxes
        ):
            boxes.append((x, y, w, h))

    if not boxes:
        return warped_img.copy(), []

    boxes = sorted(boxes, key=lambda b: b[1])
    rows_grouped = []
    current_row = [boxes[0]]
    y_threshold = 10

    for b in boxes[1:]:
        if abs(b[1] - current_row[-1][1]) < y_threshold:
            current_row.append(b)
        else:
            rows_grouped.append(current_row)
            current_row = [b]
    rows_grouped.append(current_row)

    rows_grouped = [sorted(row, key=lambda b: b[0]) for row in rows_grouped]

    id_cols = 8
    id_cells = list(itertools.chain.from_iterable(
        row[-id_cols:] for row in rows_grouped if len(row) >= id_cols
    ))

    debug_img = (
        cv2.cvtColor(warped_img, cv2.COLOR_GRAY2BGR)
        if len(warped_img.shape) == 2
        else warped_img.copy()
    )

    for idx, (x, y, w, h) in enumerate(id_cells):
        cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(debug_img, str(idx + 1), (x + 4, y + 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 1)

    return debug_img, id_cells

def clean_and_rebuild_cell(cropped):
    if len(cropped.shape) == 3:
        gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    else:
        gray = cropped.copy()

    # Light blur to reduce noise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # Otsu's thresholding (automatically chooses the best global threshold)
    _, binary = cv2.threshold(
        gray, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Invert to get white digit on black background (MNIST style)
    binary = 255 - binary

    coords = cv2.findNonZero(binary)
    if coords is None:
        return np.zeros((28, 28), dtype=np.uint8)

    x, y, w, h = cv2.boundingRect(coords)

    # Small margin inside bounds
    margin = 1
    x = max(x - margin, 0)
    y = max(y - margin, 0)
    w = min(w + 2 * margin, binary.shape[1] - x)
    h = min(h + 2 * margin, binary.shape[0] - y)

    digit = binary[y:y + h, x:x + w]

    if digit.size == 0:
        return np.zeros((28, 28), dtype=np.uint8)

    # Slight dilation to thicken strokes
    kernel = np.ones((2, 2), np.uint8)
    digit = cv2.dilate(digit, kernel, iterations=1)

    # Resize to 20x20 keeping aspect ratio
    if w > h:
        new_w = 20
        new_h = max(1, int(h * (20.0 / w)))
    else:
        new_h = 20
        new_w = max(1, int(w * (20.0 / h)))

    resized = cv2.resize(digit, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Center in 28x28 image
    padded = np.zeros((28, 28), dtype=np.uint8)
    x_offset = (28 - new_w) // 2
    y_offset = (28 - new_h) // 2
    padded[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized

    return padded
