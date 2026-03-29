//
//  CameraPermissionManager.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import Foundation
import Combine
internal import AVFoundation

@MainActor
final class CameraPermissionManager: ObservableObject {
    @Published var status: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var canUseCamera: Bool {
        status == .authorized
    }

    func refresh() {
        status = AVCaptureDevice.authorizationStatus(for: .video)
    }

    func requestAccess() async {
        let granted = await AVCaptureDevice.requestAccess(for: .video)
        status = granted ? .authorized : AVCaptureDevice.authorizationStatus(for: .video)
    }
}
