from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
from image_preprocessing.predict import predict

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Create necessary directories
os.makedirs('uploads', exist_ok=True)

@app.route('/')
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/extractIds', methods=['POST'])
def process_upload():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
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
            
        return jsonify({
            "status": "success",
            "idArray": result
        })
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to process image",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)