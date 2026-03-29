//
//  PresageSessionViewModel.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import Foundation
import Combine
import SmartSpectraSwiftSDK

@MainActor
final class PresageSessionViewModel: ObservableObject {
    @Published var statusText: String = "Ready"

    private var cancellables = Set<AnyCancellable>()
    private let sdk = SmartSpectraSwiftSDK.shared

    private var currentSessionId = UUID().uuidString
    private var lastSentAt = Date.distantPast
    private let minSendInterval: TimeInterval = 3.0

    func configure() {
        sdk.setApiKey(Config.presageAPIKey)

        sdk.$metricsBuffer
            .receive(on: DispatchQueue.main)
            .sink { [weak self] buffer in
                guard let self, let buffer else { return }

                let now = Date()
                guard now.timeIntervalSince(self.lastSentAt) >= self.minSendInterval else {
                    return
                }
                self.lastSentAt = now

                let outputString = "sessionId=\(self.currentSessionId)|timestamp=\(ISO8601DateFormatter().string(from: Date()))|buffer=\(String(describing: buffer))"

                self.statusText = "Receiving Presage data"
                print("Sending payload:", outputString)
                self.sendToBackend(outputString: outputString)
            }
            .store(in: &cancellables)
    }

    func startNewCaptureSession() {
        currentSessionId = UUID().uuidString
        lastSentAt = .distantPast
        print("Starting session:", currentSessionId)
    }

    private func sendToBackend(outputString: String) {
        guard let url = URL(string: "https://princeton-bangled-masonically.ngrok-free.dev/api/presage") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("text/plain; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.httpBody = outputString.data(using: .utf8)

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error {
                print("Upload error:", error)
                return
            }

            if let httpResponse = response as? HTTPURLResponse {
                print("Status code:", httpResponse.statusCode)
            }

            if let data, let body = String(data: data, encoding: .utf8) {
                print("Response:", body)
            }
        }.resume()
    }
}
