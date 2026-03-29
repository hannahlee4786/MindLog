//
//  CameraSessionViewModel.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import Foundation
import SwiftUI
import Combine
internal import AVFoundation

@MainActor
final class CaptureSessionViewModel: ObservableObject {
    @Published var statusText = "Ready to capture"
    @Published var lastVideoURL: URL?
    @Published var isRecording = false

    let cameraPermission = CameraPermissionManager()
    let recorder = CameraRecorder()

    func prepare() async {
        cameraPermission.refresh()

        if !cameraPermission.canUseCamera {
            await cameraPermission.requestAccess()
        }

        if cameraPermission.canUseCamera {
            try? await recorder.configure(position: .front)
        }

        statusText = "Ready"
    }

    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }

    func startRecording() {
        guard cameraPermission.canUseCamera else {
            statusText = "Camera permission needed"
            return
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("mindlog-\(UUID().uuidString).mov")

        lastVideoURL = url
        statusText = "Recording..."
        isRecording = true
        recorder.startRecording(to: url)
    }

    func stopRecording() {
        recorder.stopRecording()
        isRecording = false
        statusText = "Recording stopped"
        if let url = lastVideoURL {
            print("Capture complete. Video:", url.lastPathComponent)
        }
    }
}
