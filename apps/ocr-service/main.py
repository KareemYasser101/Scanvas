from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
from image_preprocessing.predict import predict

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
# For more control, you can configure it like this:
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080", "https://scanvas-production.up.railway.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Create necessary directories
os.makedirs('uploads', exist_ok=True)

@app.route('/')
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/extractIds', methods=['POST'])
def process_upload():
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400
    
    files = request.files.getlist('images')
    if not files or all(file.filename == '' for file in files):
        return jsonify({"error": "No selected files"}), 400
    
    all_ids = []
    for file in files:
        try:
            # Read image file directly to memory
            nparr = np.frombuffer(file.read(), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({"error": "Invalid image file"}), 400
                
            # Process the image
            result = predict(image)
            if not result:
                return jsonify({
                    "status": "Failed",
                    "message": "Try uploading a high quality image with good lighting and angle"
                }), 400
            else:
                all_ids.extend(result)

        except Exception as e:
            print(f"Error processing image {file.filename}: {str(e)}")
            return jsonify({
                    "status": "Failed",
                    "message": f"Error processing image {file.filename}: {str(e)}"
                }), 400
        
    if not all_ids:
        return jsonify({
            "status": "Failed",
            "message": "No valid IDs found in any images"
        }), 400
        
    return jsonify({
        "status": "success",
        "idArray": list(set(all_ids))  # Remove duplicates
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)