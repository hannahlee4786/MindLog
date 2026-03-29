//
//  ContentView.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import SwiftUI
import SmartSpectraSwiftSDK

struct ContentView: View {
    @StateObject private var viewModel = PresageSessionViewModel()

    var body: some View {
        VStack(spacing: 20) {
            Text("MindLog Helper")
                .font(.largeTitle.bold())

            SmartSpectraView()
                .frame(height: 420)
                .clipShape(RoundedRectangle(cornerRadius: 20))

            Text(viewModel.statusText)
                .foregroundStyle(.secondary)
        }
        .padding()
        .task {
            viewModel.configure()
        }
    }
}

#Preview {
    ContentView()
}
