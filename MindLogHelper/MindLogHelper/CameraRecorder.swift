//
//  CameraRecorder.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import Foundation
import Combine
internal import AVFoundation

final class CameraRecorder: NSObject, ObservableObject {
    @Published var isRecording = false

    let session = AVCaptureSession()

    private let sessionQueue = DispatchQueue(label: "mindlog.camera.session.queue")
    private let movieOutput = AVCaptureMovieFileOutput()

    func configure(position: AVCaptureDevice.Position = .front) async throws {
        try await withCheckedThrowingContinuation { continuation in
            sessionQueue.async {
                do {
                    if self.session.inputs.isEmpty {
                        self.session.beginConfiguration()
                        self.session.sessionPreset = .high

                        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                                   for: .video,
                                                                   position: position) else {
                            throw NSError(domain: "CameraRecorder", code: 1)
                        }

                        let input = try AVCaptureDeviceInput(device: camera)

                        guard self.session.canAddInput(input) else {
                            throw NSError(domain: "CameraRecorder", code: 2)
                        }
                        self.session.addInput(input)

                        guard self.session.canAddOutput(self.movieOutput) else {
                            throw NSError(domain: "CameraRecorder", code: 3)
                        }
                        self.session.addOutput(self.movieOutput)

                        self.session.commitConfiguration()
                    }

                    if !self.session.isRunning {
                        self.session.startRunning()
                    }

                    continuation.resume()
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func startRecording(to url: URL) {
        guard !movieOutput.isRecording else { return }
        movieOutput.startRecording(to: url, recordingDelegate: self)
        isRecording = true
    }

    func stopRecording() {
        guard movieOutput.isRecording else { return }
        movieOutput.stopRecording()
        isRecording = false
    }
}

extension CameraRecorder: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput,
                    didFinishRecordingTo outputFileURL: URL,
                    from connections: [AVCaptureConnection],
                    error: Error?) {
        if let error {
            print("Video recording error:", error)
        } else {
            print("Video saved to:", outputFileURL.path)
        }
    }
}
