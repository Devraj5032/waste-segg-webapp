'use client'

import React, { useEffect, useRef, useState } from "react"
import axios from "axios"
import { Camera, Check, Upload, X } from "lucide-react"
import QrScanner from "qr-scanner"

export default function QRCodeUploadForm() {
  const [images, setImages] = useState([null, null, null])
  const [predictions, setPredictions] = useState([])
  const [status, setStatus] = useState([null, null, null])
  const [showResults, setShowResults] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrCodeData, setQRCodeData] = useState("")
  const [hasValidQRCode, setHasValidQRCode] = useState(false)
  const qrScannerRef = useRef(null)
  const videoRef = useRef(null)

  const resetForm = () => {
    setImages([null, null, null])
    setPredictions([])
    setStatus([null, null, null])
    setShowResults(false)
  }

  const handleQRScan = (result) => {
    if (result) {
      if (result.data.startsWith("HS")) {
        console.log("Valid QR code found:", result.data)
        setQRCodeData(result.data)
        setHasValidQRCode(true)
        setShowQRScanner(false)
        resetForm()
      } else {
        console.log("Invalid QR Code. Must start with 'HS'. Continuing to scan...")
      }
    }
  }

  const handleQRError = (error) => {
    console.error("QR Code Error:", error)
    if (error.name !== "NotFoundException") {
      console.log("Unexpected error. Restarting scanner...")
      restartScanner()
    }
  }

  const restartScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.start()
    }
  }

  const stopQRScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
    }
    setShowQRScanner(false)
  }

  const getPredictionStatus = (imagePredictions) => {
    const classes = imagePredictions.map((pred) => pred.class)
    return classes.includes("dry waste") && classes.includes("wet waste") ? "Mixed" : "Segregated"
  }

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0]
    if (file) {
      const updatedImages = [...images]
      updatedImages[index] = file
      setImages(updatedImages)
    }
  }

  const handleManualSelection = (index, selectedStatus) => {
    const updatedStatus = [...status]
    updatedStatus[index] = selectedStatus
    setStatus(updatedStatus)
  }

  const handleSubmit = async () => {
    const hasSelectedImage = images.some((image) => image !== null)

    if (!hasSelectedImage) {
      alert("Please upload at least one image before submitting.")
      return
    }

    try {
      const api_key = "El2aIBbO64HqJR7jdx6K"
      const api_url = "https://detect.roboflow.com/waste-segregation-sqe9y/1"

      const imagePredictions = await Promise.all(
        images.map(async (image) => {
          if (!image) return null
          const base64Image = await convertToBase64(image)
          const response = await axios.post(api_url, base64Image, {
            params: { api_key },
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          })
          return response.data.predictions
        })
      )

      const updatedStatus = imagePredictions.map((prediction) => {
        return prediction?.length ? getPredictionStatus(prediction) : null
      })

      setPredictions(imagePredictions)
      setStatus(updatedStatus)
      setShowResults(true)
    } catch (error) {
      console.error("Error:", error.message)
    }
  }

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(",")[1])
      reader.onerror = (error) => reject(error)
    })
  }

  const handleSubmitResults = async () => {
    try {
      const resultsData = {
        qrCodeData: qrCodeData,
        predictions: [],
        images: []
      }

      for (let i = 0; i < images.length; i++) {
        if (images[i]) {
          // Convert all images to base64
          const base64Image = await convertToBase64(images[i])
          resultsData.images.push(base64Image)

          // Add prediction or manual selection
          if (status[i]) {
            resultsData.predictions.push(status[i])
          } else if (!predictions[i]?.length) {
            // This is a manually selected image without a prediction
            resultsData.predictions.push("Manual")
          } else {
            resultsData.predictions.push("Unknown")
          }
        } else {
          // If no image was uploaded for this slot
          resultsData.images.push(null)
          resultsData.predictions.push(null)
        }
      }

      // Determine overall status
      if (resultsData.predictions.includes("Mixed")) {
        resultsData.overallStatus = "Mixed"
      } else if (resultsData.predictions.includes("Segregated")) {
        resultsData.overallStatus = "Segregated"
      } else {
        resultsData.overallStatus = "Unknown"
      }

      // Log the data being sent
      console.log(resultsData)

      // Make API call
      const apiUrl = "/server/submitResults" // Replace with your actual API endpoint
      const response = await axios.post(apiUrl, resultsData)

      console.log("Results submitted successfully:", response.data)
      alert("Results submitted successfully!")
      resetForm()
      setQRCodeData("")
      setHasValidQRCode(false)
    } catch (error) {
      console.error("Error submitting results:", error)
      alert("Error submitting results. Please try again.")
    }
  }

  useEffect(() => {
    if (showQRScanner && videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        handleQRScan,
        {
          onDecodeError: handleQRError,
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )
      qrScannerRef.current.start().then(() => {
        console.log("QR scanner started successfully")
      }).catch((error) => {
        console.error("Failed to start QR scanner:", error)
      })
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [showQRScanner])

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="fixed top-0 left-0 right-0 flex items-center justify-center w-full max-w-md mx-auto px-4 py-2 bg-white shadow-md space-x-2">
        <input
          type="text"
          placeholder="QR Code Data"
          value={qrCodeData}
          readOnly
          className="flex-grow p-2 border rounded-md border-gray-300 text-black"
        />
        <button className="p-2 bg-blue-500 text-white rounded-md" onClick={() => setShowQRScanner(true)}>
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {showQRScanner && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="relative w-full max-w-md bg-white p-4 rounded-lg shadow-lg">
            <button
              className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full"
              onClick={() => {
                stopQRScanner()
                setShowQRScanner(false)
              }}
            >
              <X className="h-5 w-5 text-black" />
            </button>
            <video ref={videoRef} className="w-full h-60 pt-6" style={{ objectFit: "cover" }}></video>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mt-20">
        {!showResults ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {images.map((image, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-24 h-24 mb-2 bg-gray-200 flex items-center justify-center rounded-lg overflow-hidden">
                    {image ? (
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Uploaded ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Upload className="text-gray-400" />
                    )}
                  </div>
                  <label className={`w-full ${!hasValidQRCode && 'opacity-50 cursor-not-allowed'}`}>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleImageUpload(index, e)}
                      disabled={!hasValidQRCode}
                    />
                    <div className={`p-2 text-center text-white bg-blue-500 rounded ${hasValidQRCode ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      Upload
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <button onClick={handleSubmit} className={`w-full p-2 text-white rounded-md ${hasValidQRCode ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`} disabled={!hasValidQRCode}>
              Submit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {images.map(
              (image, index) =>
                image && (
                  <div key={index} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Result ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-black text-lg">
                          {status[index] ? `Status: ${status[index]}` : "No Prediction"}
                        </h3>
                        {!predictions[index]?.length && !status[index] && (
                          <div className="mt-2 space-x-2 flex flex-wrap gap-4">
                            <button
                              className="p-2 bg-blue-500 text-white rounded-md"
                              onClick={() => handleManualSelection(index, "Segregated")}
                            >
                              <Check className="inline-block mr-2 h-4 w-4" />
                              Segregated
                            </button>
                            <button
                              className="p-2 bg-red-500 text-white rounded-md"
                              onClick={() => handleManualSelection(index, "Mixed")}
                            >
                              <X className="inline-block mr-2 h-4 w-4" /> Mixed
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
            )}
            <button onClick={handleSubmitResults} className="w-full p-2 bg-green-500 text-white rounded-md">Submit Results</button>
          </div>
        )}
      </div>
    </div>
  )
}